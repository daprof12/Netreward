// kycUtils.ts — Role-specific KYC status helpers

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type KycTargetRole = 'user' | 'sp' | 'isp';

/** Returns the KYC status for a given role from the user profile. */
export function getRoleKycStatus(profile: any, role: KycTargetRole): KycStatus {
  if (role === 'sp')  return (profile?.kyc_sp_status  as KycStatus) || 'none';
  if (role === 'isp') return (profile?.kyc_isp_status as KycStatus) || 'none';
  return (profile?.kyc_user_status as KycStatus) || 'none';
}

/** The users table column name for a given role's KYC status. */
export function kycStatusColumn(role: KycTargetRole): string {
  if (role === 'sp')  return 'kyc_sp_status';
  if (role === 'isp') return 'kyc_isp_status';
  return 'kyc_user_status';
}

/** Shield icon fill color for a KYC status. */
export function kycShieldColor(status: KycStatus): string {
  if (status === 'verified') return '#10B981'; // green
  if (status === 'pending')  return '#F59E0B'; // orange
  if (status === 'rejected') return '#EF4444'; // red
  return '#6B7280'; // grey — none / unknown
}

/** Human-readable label for a KYC status. */
export function kycStatusLabel(status: KycStatus): string {
  if (status === 'verified') return 'Verified';
  if (status === 'pending')  return 'Pending Review';
  if (status === 'rejected') return 'Rejected';
  return 'Not Started';
}

/** Returns true if the user is KYC-verified for the given role. */
export function isKycVerified(profile: any, role: KycTargetRole): boolean {
  return getRoleKycStatus(profile, role) === 'verified';
}
