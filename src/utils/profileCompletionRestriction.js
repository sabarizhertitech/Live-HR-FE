/**
 * 7-Day Profile Completion & Access Restriction Utility (Frontend)
 * Logic Introduction Start Date: October 8, 2026 (2026-10-08)
 */

export const LOGIC_START_DATE_STR = "2026-10-08";

function parseDateOnly(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function checkProfileRestriction(userOrEmployee) {
  if (!userOrEmployee) {
    return {
      isRestricted: false,
      daysRemaining: 7,
      isLastDay: false,
      isNewEmployee: false,
      isComplete: false,
      isRejected: false,
      deadline: null,
      completion: 0,
      periodStartDate: null,
    };
  }

  const role = userOrEmployee.role;
  // 1. Applies only to employees
  if (role && role !== "employee") {
    return {
      isRestricted: false,
      daysRemaining: 7,
      isLastDay: false,
      isNewEmployee: false,
      isComplete: true,
      isRejected: false,
      deadline: null,
      completion: Number(userOrEmployee.profileCompletion || 0),
      periodStartDate: null,
    };
  }

  const isRejected =
    userOrEmployee.profileApprovalStatus === "rejected" ||
    userOrEmployee.approvalStatus === "rejected";

  const completion = Math.min(
    Math.max(Number(userOrEmployee.profileCompletion ?? 0), 0),
    100
  );

  // 3. Profile Must Be 100% Complete and NOT currently rejected
  if (!isRejected && (completion >= 100 || userOrEmployee.isProfileCompleted === true)) {
    return {
      isRestricted: false,
      daysRemaining: 0,
      isLastDay: false,
      isNewEmployee: false,
      isComplete: true,
      isRejected: false,
      deadline: null,
      completion: 100,
      periodStartDate: null,
    };
  }

  // 2. Profile Completion Period:
  // Base date when logic is introduced: 08 Oct 2026
  const logicStartDate = new Date(2026, 9, 8); // month 9 is October (0-indexed)

  const dateJoined = userOrEmployee.dateJoined || userOrEmployee.dateOfJoining;
  const joiningDate = parseDateOnly(dateJoined) || parseDateOnly(userOrEmployee.createdAt);

  let isNewEmployee = false;
  let periodStartDate;

  if (isRejected) {
    // Rejected by Admin: calculate 7-day period starting from rejection date
    const rejectionDate =
      userOrEmployee.reviewedAt ||
      userOrEmployee.profileRejectedAt ||
      userOrEmployee.updatedAt ||
      userOrEmployee.createdAt;
    periodStartDate = parseDateOnly(rejectionDate) || parseDateOnly(new Date());
  } else if (joiningDate && joiningDate.getTime() >= logicStartDate.getTime()) {
    // New Employee: Date of Joining is on or after logic introduction date (08 Oct 2026)
    isNewEmployee = true;
    periodStartDate = new Date(joiningDate);
  } else {
    // Existing Employee: Calculate 7-day period starting from 08 Oct 2026
    isNewEmployee = false;
    periodStartDate = new Date(logicStartDate);
  }

  // 7-Day Completion Period:
  // Day 1 to Day 7 inclusive. Day 8 begins exactly 7 full days after periodStartDate at 00:00:00
  const deadline = new Date(periodStartDate);
  deadline.setDate(deadline.getDate() + 7);
  deadline.setHours(0, 0, 0, 0);

  const now = new Date();
  const today = parseDateOnly(now);
  const startDay = parseDateOnly(periodStartDate);

  // Calendar days elapsed from periodStartDate:
  // Day 1 (startDay): daysElapsed = 0
  // Day 2: daysElapsed = 1
  // ...
  // Day 7: daysElapsed = 6
  // Day 8+: daysElapsed >= 7
  const daysElapsed = Math.max(
    0,
    Math.floor((today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysRemaining = Math.max(0, 7 - daysElapsed);

  // Day 7 is the 7th and final day of the 7-day window (daysElapsed === 6, daysRemaining === 1)
  const isLastDay = daysRemaining === 1 && daysElapsed === 6;

  // Starting from Day 8, if profile < 100% or rejected, access is restricted
  const isRestricted = daysElapsed >= 7;

  return {
    isRestricted,
    daysRemaining,
    isLastDay,
    isNewEmployee,
    isRejected,
    isComplete: false,
    deadline,
    completion,
    periodStartDate,
  };
}
