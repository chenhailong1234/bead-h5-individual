export type CountBucket = {
  regularCount: number;
  memberCount: number;
};

export type DeductionType = "regular" | "ai";
export type PackageType = "normal" | "ai";

export function deductForTask(user: CountBucket, isAI: boolean) {
  if (isAI) {
    if (user.memberCount === 0) {
      throw new Error("NO_AI_COUNT");
    }

    return {
      user: {
        ...user,
        memberCount: user.memberCount === -1 ? -1 : user.memberCount - 1
      },
      deduction: { type: "ai" as const, count: user.memberCount === -1 ? 0 : 1 }
    };
  }

  if (user.regularCount === 0) {
    throw new Error("NO_REGULAR_COUNT");
  }

  return {
    user: {
      ...user,
      regularCount: user.regularCount === -1 ? -1 : user.regularCount - 1
    },
    deduction: { type: "regular" as const, count: user.regularCount === -1 ? 0 : 1 }
  };
}

export function refundForTask(user: CountBucket, type: DeductionType | null | undefined, count: number): CountBucket {
  if (!type || count <= 0) {
    return { ...user };
  }

  if (type === "ai") {
    return {
      ...user,
      memberCount: user.memberCount === -1 ? -1 : user.memberCount + count
    };
  }

  return {
    ...user,
    regularCount: user.regularCount === -1 ? -1 : user.regularCount + count
  };
}

export function applyCredit(user: CountBucket, packageType: PackageType, count: number): CountBucket {
  if (packageType === "ai") {
    return {
      ...user,
      memberCount: user.memberCount === -1 ? -1 : user.memberCount + count
    };
  }

  return {
    ...user,
    regularCount: user.regularCount === -1 ? -1 : user.regularCount + count
  };
}
