import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Building, CheckCircle2, AlertCircle, Loader2, Plus, Wallet } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useToastStore } from '@/stores/useToastStore';
import { useWalletStore } from '@/stores/useWalletStore';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { wallet } = useWallet();
  const { balanceNRT } = useWalletStore();
  const { platformBanks, paymentMethods, addPaymentMethod, requestWithdrawal, isRequestingWithdrawal, isAddingMethod } = useWithdrawals();
  const { selectedCurrency, convertNrt } = useCurrencyStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  
  // New Bank form
  const [bankId, setBankId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);

  const availableBalance = balanceNRT;
  const withdrawAmount = Number(amount) || 0;
  const isAmountValid = withdrawAmount > 0 && withdrawAmount <= availableBalance;
  
  const fiatPreview = convertNrt(withdrawAmount);

  const handleNextAmount = () => {
    if (!isAmountValid) return;
    setStep(2);
  };

  const handleAddBank = async () => {
    if (!bankId || !accountNumber || !accountName) {
      showToast('Please fill all bank details', 'danger');
      return;
    }
    try {
      const newMethod = await addPaymentMethod({ bank_id: bankId, account_number: accountNumber, account_name: accountName });
      setSelectedMethodId(newMethod.id);
      showToast('Bank account added successfully', 'success');
      setStep(4); // Go to confirm
    } catch (error: any) {
      showToast(error.message || 'Failed to add bank account', 'danger');
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!selectedMethodId) return;
    try {
      await requestWithdrawal({
        amountNrt: withdrawAmount,
        paymentMethodId: selectedMethodId,
        fiatAmount: fiatPreview.amount,
        currency: selectedCurrency.split(' ')[0]
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setTimeout(() => { setStep(1); setAmount(''); setIsSuccess(false); setSelectedMethodId(null); }, 500);
      }, 3000);
    } catch (error: any) {
      showToast(error.message || 'Withdrawal failed', 'danger');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-bg-card border border-glass-border w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-glass-border flex justify-between items-center bg-bg-secondary">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Wallet size={20} className="text-accent-primary" />
              Withdraw Fiat
            </h3>
            <button onClick={onClose} className="p-2 rounded-full bg-bg-card hover:bg-glass-border transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: AMOUNT */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-text-secondary mb-1">Available Balance</p>
                    <p className="text-3xl font-black text-text-primary">{availableBalance.toFixed(2)} NRT</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-2 block uppercase tracking-wider">Withdraw Amount (NRT)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-4 pr-16 py-4 text-xl font-bold focus:outline-none focus:border-accent-primary"
                      />
                      <button 
                        onClick={() => setAmount(availableBalance.toString())}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-accent-primary/10 text-accent-primary px-3 py-1.5 rounded-lg"
                      >
                        MAX
                      </button>
                    </div>
                    {withdrawAmount > availableBalance && (
                      <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={12}/> Insufficient balance</p>
                    )}
                  </div>

                  <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-text-secondary">You will receive approx:</span>
                      <span className="font-bold text-lg text-emerald-400">{fiatPreview.symbol}{fiatPreview.amount}</span>
                    </div>
                    <p className="text-[10px] text-text-secondary text-right">Based on current NRT rate</p>
                  </div>

                  <button
                    onClick={handleNextAmount}
                    disabled={!isAmountValid}
                    className="w-full py-4 rounded-xl bg-accent-primary text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-accent-primary/20"
                  >
                    Continue <ArrowRight size={20} />
                  </button>
                </motion.div>
              )}

              {/* STEP 2: SELECT PAYMENT METHOD */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h4 className="font-bold mb-2">Select Destination Account</h4>
                  
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {paymentMethods?.map(method => (
                      <div 
                        key={method.id}
                        onClick={() => { setSelectedMethodId(method.id); setStep(4); }}
                        className="p-4 rounded-xl border border-glass-border bg-bg-secondary hover:border-accent-primary cursor-pointer transition-colors flex items-center gap-4"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                          <Building size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-text-primary">{method.platform_banks?.name}</p>
                          <p className="text-xs text-text-secondary">•••• {method.account_number.slice(-4)}</p>
                        </div>
                        <ArrowRight size={16} className="text-text-secondary" />
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setStep(3)}
                    className="w-full p-4 rounded-xl border border-dashed border-glass-border text-accent-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-accent-primary/5 transition-colors"
                  >
                    <Plus size={18} /> Add New Bank Account
                  </button>

                  <button onClick={() => setStep(1)} className="w-full py-3 text-sm font-bold text-text-secondary">Back</button>
                </motion.div>
              )}

              {/* STEP 3: ADD NEW BANK */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h4 className="font-bold mb-4">Add Bank Account</h4>
                  
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase">Select Bank</label>
                    <select 
                      value={bankId} 
                      onChange={e => setBankId(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary appearance-none"
                    >
                      <option value="">-- Choose your bank --</option>
                      {platformBanks?.map(bank => (
                        <option key={bank.id} value={bank.id}>{bank.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase">Account Number</label>
                    <input 
                      type="text" 
                      value={accountNumber} 
                      onChange={e => setAccountNumber(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary"
                      placeholder="e.g. 0123456789"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase">Account Name</label>
                    <input 
                      type="text" 
                      value={accountName} 
                      onChange={e => setAccountName(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary"
                      placeholder="Exact name on account"
                    />
                    <p className="text-[10px] text-text-secondary mt-1">Must match your verified KYC document.</p>
                  </div>

                  <button 
                    onClick={handleAddBank}
                    disabled={isAddingMethod || !bankId || !accountNumber || !accountName}
                    className="w-full py-4 rounded-xl bg-accent-primary text-white font-bold text-sm disabled:opacity-50 mt-4 flex justify-center"
                  >
                    {isAddingMethod ? <Loader2 size={18} className="animate-spin" /> : 'Save Bank & Continue'}
                  </button>
                  <button onClick={() => setStep(2)} className="w-full py-3 text-sm font-bold text-text-secondary">Back</button>
                </motion.div>
              )}

              {/* STEP 4: CONFIRMATION */}
              {step === 4 && !isSuccess && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h4 className="font-bold mb-2">Review Withdrawal</h4>
                  
                  <div className="bg-bg-secondary p-5 rounded-xl border border-glass-border space-y-4">
                    <div className="flex justify-between border-b border-glass-border pb-3">
                      <span className="text-sm text-text-secondary">Amount</span>
                      <span className="font-bold">{withdrawAmount} NRT</span>
                    </div>
                    <div className="flex justify-between border-b border-glass-border pb-3">
                      <span className="text-sm text-text-secondary">Fiat Equivalent</span>
                      <span className="font-bold text-emerald-400">{fiatPreview.symbol}{fiatPreview.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Destination</span>
                      <span className="font-bold text-right text-sm">
                        {paymentMethods?.find(m => m.id === selectedMethodId)?.platform_banks?.name}<br/>
                        <span className="text-text-secondary text-xs font-normal">
                          •••• {paymentMethods?.find(m => m.id === selectedMethodId)?.account_number.slice(-4)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-500">Withdrawals may take up to 24 hours to process and reflect in your bank account.</p>
                  </div>

                  <button 
                    onClick={handleConfirmWithdrawal}
                    disabled={isRequestingWithdrawal}
                    className="w-full py-4 rounded-xl bg-accent-primary text-white font-bold text-lg disabled:opacity-50 flex justify-center items-center shadow-lg shadow-accent-primary/20"
                  >
                    {isRequestingWithdrawal ? <Loader2 size={24} className="animate-spin" /> : 'Confirm Withdrawal'}
                  </button>
                  <button onClick={() => setStep(2)} className="w-full py-3 text-sm font-bold text-text-secondary">Back</button>
                </motion.div>
              )}

              {/* SUCCESS */}
              {isSuccess && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-8">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black mb-2 text-center">Withdrawal Requested</h3>
                  <p className="text-text-secondary text-center text-sm px-4">Your withdrawal of {withdrawAmount} NRT has been requested and is pending approval.</p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
