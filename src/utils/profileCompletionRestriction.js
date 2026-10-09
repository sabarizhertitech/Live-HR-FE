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
      isNewEmployee: false,
      isComplete: false,
      deadline: null,
      completion: 0,
    };
  }

  const role = userOrEmployee.role;
  // 1. Applies only to employees
  if (role !== "employee") {
    return {
      isRestricted: false,
      daysRemaining: 7,
      isNewEmployee: false,
      isComplete: true,
      deadline: null,
      completion: Number(userOrEmployee.profileCompletion || 0),
    };
  }

  const completion = Math.min(
    Math.max(Number(userOrEmployee.profileCompletion ?? 0), 0),
    100
  );

  // 3. Profile Must Be 100% Complete - No admin approval required to lift restriction
  if (completion >= 100 || userOrEmployee.isProfileCompleted === true) {
    return {
      isRestricted: false,
      daysRemaining: 0,
      isNewEmployee: false,
      isComplete: true,
      deadline: null,
      completion: 100,
    };
  }

  // 2. Profile Completion Period:
  // Base date when logic is introduced: 08 Oct 2026
  const logicStartDate = new Date(2026, 9, 8); // month 9 is October (0-indexed)

  const dateJoined = userOrEmployee.dateJoined || userOrEmployee.dateOfJoining;
  const joiningDate = parseDateOnly(dateJoined) || parseDateOnly(userOrEmployee.createdAt);

  let isNewEmployee = false;
  let periodStartDate;

  // New Employee: Date of Joining is on or after logic introduction date (08 Oct 2026)
  if (joiningDate && joiningDate.getTime() >= logicStartDate.getTime()) {
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

  // Calculate days remaining (1 to 7 during the period, 0 once expired)
  const msRemaining = deadline.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  // Starting from Day 8, if profile < 100%, access is restricted
  const isRestricted = now.getTime() >= deadline.getTime();

  return {
    isRestricted,
    daysRemaining,
    isNewEmployee,
    isComplete: false,
    deadline,
    completion,
    periodStartDate,
  };
}
