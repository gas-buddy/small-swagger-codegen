import Foundation

func json(_ it: SwaggerSerializeable) -> String {
    return String(data:it.toJson(), encoding: .utf8)!
}
func jsonObj(_ it: SwaggerSerializeable) -> Any {
    return try! JSONSerialization.jsonObject(with: json(it).data(using: .utf8)!)
}

let a = AccountWalletStatusName(firstName: "first", lastName: "last")
print(a)
Api.accountIdCreditBalanceGet(accountId: "sdfs") { _, _ in }


Api.accountIdStatusGet(accountId: "id", fields: [.disposition, .instruments]) {err, status in
    print(status.programs!)
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
print(json(Instrument.deserialize(json: jsonObj(ins))))

let pd = ProgramDetails(name: "name", type: "type", activatedAt: Date(), perGallonDiscount: "pgd", initialPerGallonDiscount: "initialpgd", isEligibleForInitialDiscount: true, transactionsRequiredForInitialDiscount: 42, initialDiscountExpiration: Date(), unitString: "CASHBACK in Points")
let r1 = Referral(program: pd, refereeEnrolledAt: Date(), refereeTransactedAt: Date(), referrerDiscountedTransactionId: "FIRST ONE")
let r2 = Referral(program: pd, refereeEnrolledAt: Date(), refereeTransactedAt: Date(), referrerDiscountedTransactionId: "SECOND ONE")
let rwi = ReferralsWithInfo(
    code: "code",
    program: pd,
    enrollmentProgram: pd,
    link: "link", referrals: [r1, r2]
)
print(json(ReferralsWithInfo.deserialize(json: jsonObj(rwi))))

