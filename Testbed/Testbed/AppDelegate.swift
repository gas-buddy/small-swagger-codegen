//
//  AppDelegate.swift
//  Testbed
//
//  Created by Griffin Schneider on 3/26/18.
//  Copyright © 2018 Griffin Schneider. All rights reserved.
//

import Cocoa

func json(_ it: SwaggerContainer) -> String {
    return String(data:it.toJson(), encoding: .utf8)!
}
func jsonObj(_ it: SwaggerContainer) -> Any {
    return try! JSONSerialization.jsonObject(with: json(it).data(using: .utf8)!)
}

func test() {
    
    
    let a = AccountWalletStatusName(firstName: "first", lastName: "last")
    PaymentApi.getCreditBalances(accountId: "sdfs") { _, _ in }
    
    
    PaymentApi.accountIdStatusGet(accountId: "@me", fields: [.disposition, .instruments]) {err, status in
        print(status.serializeToString(format: nil))
    }
    PaymentApi.getTransactionHistory(accountId: "@butts") { err, res in
        print(err.debugDescription)
        print(res.serializeToString(format: nil))
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
    
    
    let testData = try! JSONSerialization.jsonObject(with: """
{
"instrument_id": "id",
"instrument_type": "checking_account"
}
""".data(using: .utf8)!)
    
    print(json(Instrument.deserialize(json: testData)))
}

@NSApplicationMain
class AppDelegate: NSObject, NSApplicationDelegate {

    @IBOutlet weak var window: NSWindow!


    func applicationDidFinishLaunching(_ aNotification: Notification) {
        test()
    }

    func applicationWillTerminate(_ aNotification: Notification) {
        // Insert code here to tear down your application
    }


}

