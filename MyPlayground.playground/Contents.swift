import Foundation

func printJson(_ it: SwaggerSerializeable) {
    print(String(data:it.toJson(), encoding: .utf8)!)
}

let a = AccountWalletStatusName(firstName: "first", lastName: "last")
print(a)
Api.accountIdCreditBalanceGet(accountId: "sdfs") { _, _ in }


Api.accountIdStatusGet(accountId: "id", fields: [.disposition, .instruments]) {err, status in
    print(status.programs)
}

let ins = Instrument(
    instrumentId: "id",
    instrumentName: "name",
    instrumentType: .checkingAccount,
    providerName: "provider",
    friendlyName: "friendly",
    expiration: "exp",
    lastDigits: "4242",
    tags: ["tag1", "tag2"]
)
printJson(ins)

let pd = ProgramDetails(name: "name", type: "type", activatedAt: Date(), perGallonDiscount: "pgd", initialPerGallonDiscount: "initialpgd", isEligibleForInitialDiscount: true, transactionsRequiredForInitialDiscount: 42, initialDiscountExpiration: Date(), unitString: "CASHBACK in Points")
let r1 = Referral(program: pd, refereeEnrolledAt: Date(), refereeTransactedAt: Date(), referrerDiscountedTransactionId: "FIRST ONE")
let r2 = Referral(program: pd, refereeEnrolledAt: Date(), refereeTransactedAt: Date(), referrerDiscountedTransactionId: "SECOND ONE")
let rwi = ReferralsWithInfo(
    code: "code",
    program: pd,
    enrollmentProgram: pd,
    link: "link", referrals: [r1, r2]
)

printJson(rwi)
