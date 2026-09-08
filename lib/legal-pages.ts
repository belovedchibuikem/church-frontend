export type LegalPageCopy = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  sections: Array<{ title: string; body: string }>;
};

/** Canonical public policy copy. CMS can override when a published page exists. */
export const legalPages: Record<string, LegalPageCopy> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'How Family House Connect collects, uses, and protects personal information.',
    body: 'Family House Connect (“we”, “us”) operates a ministry platform for local churches, home fellowships, online gatherings, missions, giving, and Kingdom Citizens Academy (KCA). This Privacy Policy describes the personal information we process when you use the public website, member account, admin tools, or related mobile apps. Last updated: 8 September 2026.',
    sections: [
      { title: 'Who we are', body: 'Family House Connect is a global ministry network. For privacy questions, contact hello@familyhouseconnect.org. Operational headquarters are listed on the Contact page.' },
      { title: 'Information we collect', body: 'Depending on how you use the platform we may collect: identity and contact details; location used to find a church; membership, groups, and ministry involvement; KCA applications, enrolment, attendance, and certificates; giving amounts, funds, and receipts; prayer requests, need requests, and testimonies; messages and notifications preferences; guardian or child-account links where safeguarding requires them; and technical data such as device, session, and security logs.' },
      { title: 'How we use information', body: 'We use personal information to create and secure accounts, connect you with churches and online gatherings, process giving, administer KCA and events, provide pastoral and operational tools to authorised leaders, send the communications you consent to, improve the service, and meet legal, financial, and safeguarding obligations.' },
      { title: 'Legal bases', body: 'Where data-protection law applies, we process information because you asked for a service (contract), because we have a legitimate ministry interest (for example securing accounts or finding a nearby church), because you consented (marketing or optional analytics), or because we must comply with law or protect vital interests in a safeguarding emergency.' },
      { title: 'Churches, giving, and KCA', body: 'Leaders of a church or home church you join may see membership and ministry records needed to care for that community. Finance teams see giving needed to issue receipts. KCA administrators and assigned lecturers see study records required to teach, assess, and certify. We do not sell personal information.' },
      { title: 'Children and safeguarding', body: 'Family House Connect is not directed at children acting without a parent or guardian. Child profiles, guardian links, and communication restrictions exist to protect minors. Safeguarding reports may be retained and shared with authorised staff or authorities as required by law. See our Safeguarding page.' },
      { title: 'Sharing', body: 'We share information with churches and ministries in the Family House network that you join or apply to; payment processors for gifts; hosting, email, and security providers who process data on our instructions; and authorities when required by law or to prevent serious harm.' },
      { title: 'Retention and security', body: 'We keep information for as long as your account is active and as needed for pastoral, financial, certification, and legal records, then delete or anonymise it according to our retention rules. We use access controls, encryption in transit, session protection, and audit logging. No method of transmission is perfectly secure.' },
      { title: 'Your rights', body: 'Subject to applicable law you may access, correct, export, or request deletion of personal data, withdraw consents, and object to certain processing. Signed-in members can start a request from Privacy Controls (multi-factor authentication may be required). Some records — for example completed gifts, issued certificates, or safeguarding files — may be retained where law or ministry duty requires it.' },
      { title: 'Cookies and international use', body: 'See the Cookie Policy for cookies used on the website. Family House Connect serves members in many countries; information may be stored or accessed in locations other than where you live, with safeguards appropriate to the transfer.' },
      { title: 'Changes', body: 'We may update this policy as the platform grows. The “last updated” date will change, and material updates may be announced in the product or by email when required.' },
    ],
  },
  terms: {
    slug: 'terms',
    title: 'Terms of Use',
    summary: 'The agreement that governs Family House Connect websites, apps, and ministry tools.',
    body: 'These Terms of Use govern access to Family House Connect. By creating an account, joining a church, applying to KCA, giving, or otherwise using the platform you agree to these terms and to the Privacy Policy. Last updated: 8 September 2026.',
    sections: [
      { title: 'The service', body: 'Family House Connect provides tools for worship, community, discipleship, missions, giving, events, and Kingdom training. We may change features as ministry needs evolve. Some areas require a signed-in account, church membership, or staff permissions.' },
      { title: 'Your account', body: 'You must provide accurate information, keep credentials confidential, and enable extra security (such as multi-factor authentication) when offered for sensitive actions. You are responsible for activity under your account unless you promptly report misuse.' },
      { title: 'Acceptable use', body: 'Use the platform in a way that honours Christ and the law. You must not harass or defame others, upload unlawful or sexually exploitative content, impersonate a person or church, interfere with security, scrape private data, or misuse giving, certificates, or pastoral records.' },
      { title: 'Content you submit', body: 'Prayer requests, testimonies, messages, and similar content remain yours, but you grant Family House Connect a licence to host and display them for ministry purposes. Do not submit information about others without a proper basis. We may remove content that breaks these terms or our Community Guidelines.' },
      { title: 'Giving and KCA', body: 'Gifts are handled under the Giving Policy. KCA applications, orientation, and certificates are ministry records; certificates may be publicly verifiable when a verification code is issued. Academic or formation decisions rest with authorised KCA staff.' },
      { title: 'Disclaimers', body: 'The platform is provided for ministry use. Teaching, live streams, and publications are offered in good faith but are not a substitute for local pastoral care or professional advice. To the extent permitted by law we are not liable for indirect or consequential loss, and our aggregate liability is limited to the amount of fees you paid us in the three months before the claim (or, if none, a modest fixed amount).' },
      { title: 'Suspension and changes', body: 'We may suspend accounts that threaten safety, security, or the integrity of the family. We may update these terms; continued use after notice constitutes acceptance. If a provision is unenforceable, the rest remains in effect. These terms are governed by the laws applicable at our headquarters unless a mandatory local law says otherwise.' },
    ],
  },
  cookies: {
    slug: 'cookies',
    title: 'Cookie Policy',
    summary: 'Cookies and similar technologies used on the Family House Connect website.',
    body: 'This Cookie Policy explains how the Family House Connect website stores small files or similar technologies on your device. Last updated: 8 September 2026.',
    sections: [
      { title: 'Essential cookies', body: 'Required cookies keep you signed in, remember language, protect forms and sessions, and enforce security such as CSRF and multi-factor steps. The site cannot function reliably if these are blocked.' },
      { title: 'Preferences', body: 'We may store locale, display, and similar choices so the site stays in the language and layout you selected.' },
      { title: 'Analytics and media', body: 'If analytics are enabled, they help us understand which public pages are used so we can improve ministry communication. Embedded live or video players may set their own cookies. We do not use cookies to sell advertising profiles.' },
      { title: 'Managing cookies', body: 'You can delete or block cookies in your browser settings. Blocking essential cookies may sign you out or reset language. For personal-data rights, see the Privacy Policy.' },
    ],
  },
  safeguarding: {
    slug: 'safeguarding',
    title: 'Safeguarding',
    summary: 'Our commitment to protect children, young people, and vulnerable adults.',
    body: 'Family House Connect is committed to a culture of safety in every church, home fellowship, event, KCA cohort, and digital space. Last updated: 8 September 2026.',
    sections: [
      { title: 'Our standard', body: 'Leaders and volunteers who work with children or vulnerable people should be known, trained, and supervised according to local church policy. Digital tools include guardian links, communication restrictions, and restricted safeguarding case handling for authorised staff.' },
      { title: 'Children online', body: 'Do not create an account for a child in a way that hides their age. Parents and guardians should supervise device use. We may limit messaging, directory visibility, and live-chat features for minors.' },
      { title: 'Report a concern', body: 'If someone is in immediate danger, contact local emergency services first. Then tell a local church leader and, for platform records, use Help & Support or email hello@familyhouseconnect.org with enough detail for the safeguarding team to act. Do not investigate privately or share allegations in public channels.' },
      { title: 'How we respond', body: 'Authorised staff may restrict accounts, preserve evidence, inform pastors, and cooperate with statutory authorities. Safeguarding files are confidential and retained as required by law and ministry duty. False or malicious reports may themselves be treated as a community violation.' },
    ],
  },
  'community-guidelines': {
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    summary: 'How we gather as one family in churches, groups, and online spaces.',
    body: 'These guidelines apply to comments, groups, live gatherings, messages, testimonies, and other community features on Family House Connect. Last updated: 8 September 2026.',
    sections: [
      { title: 'Honour Christ and people', body: 'Speak with grace. Disagree without contempt. Keep teaching and testimony truthful. Follow the pastoral covering of the church or group you have joined.' },
      { title: 'Keep the space safe', body: 'Harassment, hate, threats, spam, scams, impersonation, sexually explicit material, and any exploitation of children are forbidden. Do not share another person’s private prayer or contact details without permission.' },
      { title: 'Live streams and groups', body: 'During live services and chats, stay on the message, avoid disruption, and respect hosts. Group leaders may remove posts that break these rules. Repeat harm can lead to muted chat, group removal, or account suspension.' },
      { title: 'Enforcement', body: 'We may remove content or restrict access to protect the family. Serious or illegal activity may be reported to authorities. Questions about a moderation decision can be sent through Contact Us.' },
    ],
  },
  'giving-policy': {
    slug: 'giving-policy',
    title: 'Giving Policy',
    summary: 'Tithes, offerings, missions gifts, and project donations on Family House Connect.',
    body: 'Giving through Family House Connect is an act of worship. This policy explains funds, receipts, recurring gifts, and how we handle mistakes. Last updated: 8 September 2026. It is not tax or legal advice; confirm deductibility with your own adviser and local law.',
    sections: [
      { title: 'Funds and designation', body: 'You may give toward tithe, offering, missions, KCA, or a published project. We apply gifts to the fund you select. If a project is fully funded or cannot proceed, remaining amounts may be used for a closely related ministry purpose.' },
      { title: 'Payments and receipts', body: 'Payments are processed by our payment partners. After a successful gift, a receipt is available in My Giving History. Keep receipts for your records. Recurring giving can be started or stopped from your account while the mandate remains valid.' },
      { title: 'Refunds', body: 'Charitable gifts are generally not refundable once the payment succeeds. Contact hello@familyhouseconnect.org promptly if you were charged twice, charged the wrong amount, or did not intend the payment, and include the receipt reference. Approved refunds, if any, go back to the original payment method.' },
      { title: 'Integrity', body: 'Do not use another person’s payment method without authority. We may decline or reverse gifts that appear fraudulent. Giving does not purchase influence, certificates, or membership rights beyond what Scripture and church order already provide.' },
    ],
  },
  beliefs: {
    slug: 'beliefs',
    title: 'Statement of Faith',
    summary: 'The biblical convictions that shape Family House Connect.',
    body: 'Family House Connect exists so every believer can find community, grow in Jesus Christ, serve with purpose, and multiply disciples. The following convictions guide our churches, missions, KCA, and publications.',
    sections: [
      { title: 'The Bible', body: 'We believe the Holy Scriptures are the inspired Word of God and the final authority for faith, worship, and life.' },
      { title: 'God', body: 'We believe in one God, eternally revealed as Father, Son, and Holy Spirit, worthy of all worship.' },
      { title: 'Jesus Christ', body: 'We believe Jesus Christ is the Son of God, born of the virgin Mary, crucified for our sins, risen from the dead, and returning in glory. Salvation is by grace through faith in Him.' },
      { title: 'The Holy Spirit', body: 'We believe the Holy Spirit regenerates, empowers, gifts, and sends the Church to witness in word and deed.' },
      { title: 'The Church', body: 'We believe the Church is the Body of Christ, expressed in local congregations, home fellowships, and the global family, called to worship, discipleship, fellowship, and mission.' },
      { title: 'Mission', body: 'We believe the Great Commission sends us to make disciples of all nations — planting churches, training leaders, showing compassion, and proclaiming the gospel of the Kingdom.' },
    ],
  },
};

export function legalPageBySlug(slug: string): LegalPageCopy | null {
  return legalPages[slug] ?? null;
}
