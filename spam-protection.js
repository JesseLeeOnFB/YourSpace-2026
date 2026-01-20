// spam-protection.js - Rate limiting and abuse detection system

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ═══════════════════════════════════════════════════════════
// RATE LIMIT CONFIGURATION
// ═══════════════════════════════════════════════════════════

const RATE_LIMITS = {
  // Posts
  POST_PER_MINUTE: 2,
  POST_PER_HOUR: 10,
  POST_PER_DAY: 50,
  
  // Comments
  COMMENT_PER_MINUTE: 5,
  COMMENT_PER_HOUR: 30,
  
  // Messages
  MESSAGE_PER_MINUTE: 3,
  MESSAGE_PER_HOUR: 50,
  MESSAGE_PER_DAY: 200,
  
  // Reports
  REPORT_PER_HOUR: 10,
  REPORT_PER_DAY: 25
};

// ═══════════════════════════════════════════════════════════
// RATE LIMITING FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Check if user has exceeded rate limit for an action
 * @param {string} userId - User ID
 * @param {string} actionType - 'post', 'comment', 'message', 'report'
 * @returns {Promise<{allowed: boolean, reason: string}>}
 */
export async function checkRateLimit(userId, actionType) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data() || {};
    const rateLimits = userData.rateLimits || {};
    
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Get action history
    const actionHistory = rateLimits[actionType] || {
      lastMinute: [],
      lastHour: [],
      lastDay: []
    };
    
    // Clean old timestamps
    actionHistory.lastMinute = (actionHistory.lastMinute || []).filter(t => now - t < oneMinute);
    actionHistory.lastHour = (actionHistory.lastHour || []).filter(t => now - t < oneHour);
    actionHistory.lastDay = (actionHistory.lastDay || []).filter(t => now - t < oneDay);
    
    // Check limits based on action type
    let limitExceeded = false;
    let reason = "";
    
    switch(actionType) {
      case 'post':
        if (actionHistory.lastMinute.length >= RATE_LIMITS.POST_PER_MINUTE) {
          limitExceeded = true;
          reason = `Too many posts! Please wait ${Math.ceil((actionHistory.lastMinute[0] + oneMinute - now) / 1000)} seconds.`;
        } else if (actionHistory.lastHour.length >= RATE_LIMITS.POST_PER_HOUR) {
          limitExceeded = true;
          reason = "You've reached the hourly post limit (10 posts/hour). Please try again later.";
        } else if (actionHistory.lastDay.length >= RATE_LIMITS.POST_PER_DAY) {
          limitExceeded = true;
          reason = "You've reached the daily post limit (50 posts/day). Please try again tomorrow.";
        }
        break;
        
      case 'comment':
        if (actionHistory.lastMinute.length >= RATE_LIMITS.COMMENT_PER_MINUTE) {
          limitExceeded = true;
          reason = `Too many comments! Please wait ${Math.ceil((actionHistory.lastMinute[0] + oneMinute - now) / 1000)} seconds.`;
        } else if (actionHistory.lastHour.length >= RATE_LIMITS.COMMENT_PER_HOUR) {
          limitExceeded = true;
          reason = "You've reached the hourly comment limit (30 comments/hour). Please try again later.";
        }
        break;
        
      case 'message':
        if (actionHistory.lastMinute.length >= RATE_LIMITS.MESSAGE_PER_MINUTE) {
          limitExceeded = true;
          reason = `Slow down! Please wait ${Math.ceil((actionHistory.lastMinute[0] + oneMinute - now) / 1000)} seconds before sending another message.`;
        } else if (actionHistory.lastHour.length >= RATE_LIMITS.MESSAGE_PER_HOUR) {
          limitExceeded = true;
          reason = "You've reached the hourly message limit (50 messages/hour). Please try again later.";
        } else if (actionHistory.lastDay.length >= RATE_LIMITS.MESSAGE_PER_DAY) {
          limitExceeded = true;
          reason = "You've reached the daily message limit (200 messages/day). Please try again tomorrow.";
        }
        break;
        
      case 'report':
        if (actionHistory.lastHour.length >= RATE_LIMITS.REPORT_PER_HOUR) {
          limitExceeded = true;
          reason = "You've submitted too many reports this hour. Please try again later.";
        } else if (actionHistory.lastDay.length >= RATE_LIMITS.REPORT_PER_DAY) {
          limitExceeded = true;
          reason = "You've reached the daily report limit (25 reports/day). Please try again tomorrow.";
        }
        break;
    }
    
    if (limitExceeded) {
      return { allowed: false, reason };
    }
    
    // Update rate limit tracking
    actionHistory.lastMinute.push(now);
    actionHistory.lastHour.push(now);
    actionHistory.lastDay.push(now);
    
    rateLimits[actionType] = actionHistory;
    
    await updateDoc(doc(db, "users", userId), {
      rateLimits
    });
    
    return { allowed: true, reason: "" };
    
  } catch (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true, reason: "" }; // Fail open in case of errors
  }
}

// ═══════════════════════════════════════════════════════════
// BAN SYSTEM
// ═══════════════════════════════════════════════════════════

/**
 * Check if user is banned
 * @param {string} userId - User ID
 * @returns {Promise<{isBanned: boolean, reason: string, expiresAt: Date}>}
 */
export async function checkBanStatus(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data() || {};
    
    if (!userData.banned) {
      return { isBanned: false, reason: "", expiresAt: null };
    }
    
    const ban = userData.banned;
    const now = new Date();
    
    // Check if ban has expired
    if (ban.expiresAt && ban.expiresAt.toDate() < now) {
      // Remove expired ban
      await updateDoc(doc(db, "users", userId), {
        banned: null,
        banHistory: [...(userData.banHistory || []), ban]
      });
      return { isBanned: false, reason: "", expiresAt: null };
    }
    
    return {
      isBanned: true,
      reason: ban.reason || "You have been banned from YourSpace",
      expiresAt: ban.expiresAt ? ban.expiresAt.toDate() : null
    };
    
  } catch (error) {
    console.error("Ban check error:", error);
    return { isBanned: false, reason: "", expiresAt: null };
  }
}

/**
 * Ban a user
 * @param {string} userId - User ID to ban
 * @param {string} reason - Reason for ban
 * @param {number} durationHours - Duration in hours (null = permanent)
 * @param {string} bannedBy - Admin user ID who issued the ban
 */
export async function banUser(userId, reason, durationHours = null, bannedBy) {
  try {
    const expiresAt = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;
    
    await updateDoc(doc(db, "users", userId), {
      banned: {
        reason,
        bannedAt: serverTimestamp(),
        bannedBy,
        expiresAt,
        duration: durationHours,
        type: expiresAt ? 'temporary' : 'permanent'
      }
    });
    
    console.log(`User ${userId} banned: ${reason}`);
    
  } catch (error) {
    console.error("Ban user error:", error);
    throw error;
  }
}

/**
 * Unban a user
 * @param {string} userId - User ID to unban
 * @param {string} unbannedBy - Admin user ID who removed the ban
 */
export async function unbanUser(userId, unbannedBy) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data() || {};
    
    if (userData.banned) {
      await updateDoc(doc(db, "users", userId), {
        banned: null,
        banHistory: [...(userData.banHistory || []), {
          ...userData.banned,
          unbannedAt: serverTimestamp(),
          unbannedBy
        }]
      });
      
      console.log(`User ${userId} unbanned by ${unbannedBy}`);
    }
    
  } catch (error) {
    console.error("Unban user error:", error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// AUTO-BAN SYSTEM (for repeat offenders)
// ═══════════════════════════════════════════════════════════

/**
 * Track violations and auto-ban if threshold exceeded
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation
 */
export async function trackViolation(userId, violationType) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data() || {};
    const violations = userData.violations || {};
    
    // Increment violation count
    violations[violationType] = (violations[violationType] || 0) + 1;
    violations.total = (violations.total || 0) + 1;
    violations.lastViolation = serverTimestamp();
    
    await updateDoc(doc(db, "users", userId), { violations });
    
    // Auto-ban thresholds
    const THRESHOLDS = {
      spam: 5,           // 5 spam violations = 24hr ban
      harassment: 3,     // 3 harassment violations = 7 day ban
      hate_speech: 1,    // 1 hate speech violation = permanent ban
      total: 10          // 10 total violations = permanent ban
    };
    
    // Check for auto-ban
    if (violations.hate_speech >= THRESHOLDS.hate_speech) {
      await banUser(userId, "Permanent ban for hate speech violations", null, "SYSTEM");
    } else if (violations.harassment >= THRESHOLDS.harassment) {
      await banUser(userId, "7-day ban for harassment violations", 168, "SYSTEM");
    } else if (violations.spam >= THRESHOLDS.spam) {
      await banUser(userId, "24-hour ban for spam violations", 24, "SYSTEM");
    } else if (violations.total >= THRESHOLDS.total) {
      await banUser(userId, "Permanent ban for repeated violations", null, "SYSTEM");
    }
    
  } catch (error) {
    console.error("Track violation error:", error);
  }
}

// ═══════════════════════════════════════════════════════════
// REPORTING SYSTEM
// ═══════════════════════════════════════════════════════════

/**
 * Report content or user
 * @param {Object} reportData - Report details
 */
export async function reportContent(reportData) {
  const {
    reporterId,
    reportedUserId,
    contentType,  // 'post', 'comment', 'user', 'message'
    contentId,
    reason,       // 'spam', 'harassment', 'hate_speech', 'inappropriate', 'other'
    description
  } = reportData;
  
  try {
    // Check rate limit
    const rateCheck = await checkRateLimit(reporterId, 'report');
    if (!rateCheck.allowed) {
      throw new Error(rateCheck.reason);
    }
    
    // Create report
    const reportRef = doc(db, "reports", `${Date.now()}_${reporterId}`);
    await setDoc(reportRef, {
      reporterId,
      reportedUserId,
      contentType,
      contentId,
      reason,
      description,
      status: 'pending',
      createdAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      action: null
    });
    
    // Update reporter's report count
    await updateDoc(doc(db, "users", reporterId), {
      'stats.reportsSubmitted': increment(1)
    });
    
    // Update reported user's report count
    await updateDoc(doc(db, "users", reportedUserId), {
      'stats.reportsReceived': increment(1)
    });
    
    return { success: true, message: "Report submitted successfully. Our team will review it shortly." };
    
  } catch (error) {
    console.error("Report content error:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Get pending reports (for admin)
 * @returns {Promise<Array>}
 */
export async function getPendingReports() {
  try {
    const reportsRef = collection(db, "reports");
    const q = query(reportsRef, where("status", "==", "pending"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error("Get pending reports error:", error);
    return [];
  }
}

/**
 * Review a report (for admin)
 * @param {string} reportId - Report ID
 * @param {string} action - 'ban', 'warn', 'dismiss', 'delete_content'
 * @param {string} reviewedBy - Admin user ID
 */
export async function reviewReport(reportId, action, reviewedBy) {
  try {
    const reportDoc = await getDoc(doc(db, "reports", reportId));
    if (!reportDoc.exists()) {
      throw new Error("Report not found");
    }
    
    const report = reportDoc.data();
    
    // Take action based on review
    if (action === 'ban') {
      await banUser(report.reportedUserId, `Banned for ${report.reason}`, 168, reviewedBy);
      await trackViolation(report.reportedUserId, report.reason);
    } else if (action === 'warn') {
      await trackViolation(report.reportedUserId, report.reason);
    }
    
    // Update report status
    await updateDoc(doc(db, "reports", reportId), {
      status: 'reviewed',
      action,
      reviewedAt: serverTimestamp(),
      reviewedBy
    });
    
    return { success: true };
    
  } catch (error) {
    console.error("Review report error:", error);
    return { success: false, message: error.message };
  }
}

// Export all functions
export default {
  checkRateLimit,
  checkBanStatus,
  banUser,
  unbanUser,
  trackViolation,
  reportContent,
  getPendingReports,
  reviewReport
};
