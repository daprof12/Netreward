package io.netreward.sdk

import android.app.*
import android.content.*
import android.net.TrafficStats
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.work.*
import java.util.concurrent.TimeUnit

class NetRewardTrackingService : Service() {

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, "NRT_TRACKING")
            .setContentTitle("NetReward Active")
            .setContentText("Monitoring data consumption for rewards...")
            .setSmallIcon(R.drawable.ic_nrt_logo)
            .build()

        startForeground(1, notification)
        scheduleDataPolling()
        
        return START_STICKY
    }

    private fun scheduleDataPolling() {
        val workRequest = PeriodicWorkRequestBuilder<DataPollWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "nrt_poll",
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            "NRT_TRACKING",
            "NetReward Tracking",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

class DataPollWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val uid = android.os.Process.myUid()
        val rxBytes = TrafficStats.getUidRxBytes(uid)
        val txBytes = TrafficStats.getUidTxBytes(uid)

        // TODO: Report (rxBytes + txBytes) to api.netreward.online/v1/tracking
        return Result.success()
    }
}
