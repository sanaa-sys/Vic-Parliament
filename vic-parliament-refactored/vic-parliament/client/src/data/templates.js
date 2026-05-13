// src/data/templates.js
// Fallback email templates used when the AI API is unavailable

export const TEMPLATES = {
  islamophobia: [
    {
      subject: 'Addressing anti-Muslim hate in our community',
      body: `Dear {role},

I am writing to you as a constituent in {electorate} to raise my deep concern about the rise of Islamophobia and anti-Muslim hate in Australia.

Muslim Australians — including many in your electorate — face discrimination, harassment, and vilification in their daily lives. The United Nations' International Day to Combat Islamophobia on 15 March marks the anniversary of the 2019 Christchurch mosque shootings, a tragedy that must never be forgotten.

I urge you to:
• Publicly condemn anti-Muslim hate speech and Islamophobia
• Support stronger legislation against religious vilification
• Advocate for proper resourcing of the Office of the Special Envoy to Combat Islamophobia
• Engage meaningfully with Muslim community organisations in your electorate

I look forward to your response.

Yours sincerely,
A constituent in {electorate}`,
    },
    {
      subject: 'Your position on combating Islamophobia',
      body: `Dear {role},

As your constituent, I am writing to ask you to take a strong public stand against Islamophobia and anti-Muslim hate.

Every Victorian has the right to live, work, and practise their faith free from discrimination and fear. Yet Muslim Australians continue to experience systemic prejudice, hate crimes, and media vilification.

I call on you to:
• Speak out against Islamophobia at every opportunity
• Support community-led anti-racism initiatives like the Countering Islamophobia Project
• Push for better data collection on anti-Muslim hate crimes
• Ensure Muslim voices are heard in policy decisions that affect them

Respectfully,
A resident of {electorate}`,
    },
  ],
  international: [
    {
      subject: "Australia's international responsibilities — {electorate}",
      body: `Dear {role},

I write to you as a constituent in {electorate} to raise matters of international concern that require Australia's leadership.

I urge you to:
• Champion Australia's obligations under international humanitarian law
• Support accountability mechanisms for human rights violations globally
• Advocate for a foreign policy that prioritises human dignity
• Ensure Australia's voice is heard in multilateral forums on peace and justice

Yours sincerely,
A concerned constituent in {electorate}`,
    },
  ],
  climate: [
    {
      subject: 'Urgent action needed on climate policy',
      body: `Dear {role},

I am writing as a constituent in {electorate} to urge action on the climate crisis.

Victoria is already experiencing longer heatwaves, more intense bushfires, and unpredictable weather. I ask you to champion stronger emissions reduction targets, accelerate the transition to renewable energy, and oppose new fossil fuel projects.

Yours sincerely,
A concerned constituent, {electorate}`,
    },
  ],
  housing: [
    {
      subject: 'Housing affordability is at crisis point',
      body: `Dear {role},

I write as a constituent concerned about the housing affordability crisis in {electorate}.

Rents have surged beyond what ordinary workers can afford. I urge you to support policies that increase social and affordable housing supply, strengthen renters' rights, and address speculative investment.

Sincerely,
A constituent in {electorate}`,
    },
  ],
  health: [
    {
      subject: 'Our healthcare system needs urgent investment',
      body: `Dear {role},

I am writing as a constituent to raise concerns about the strain on our healthcare system.

Wait times are dangerously long, GPs are under pressure, and mental health services are underfunded. I urge you to advocate for increased hospital funding, expanded bulk billing, and investment in mental health care.

Yours sincerely,
A constituent in {electorate}`,
    },
  ],
  transport: [
    {
      subject: 'Public transport in our area needs urgent improvement',
      body: `Dear {role},

As a constituent in {electorate}, I am writing about inadequate public transport in our community.

Frequent cancellations and poor frequency make it difficult to get around without a car. I ask you to advocate for increased investment in rail and bus services and better regional connections.

Sincerely,
A local constituent`,
    },
  ],
  education: [
    {
      subject: 'Education funding must be a priority',
      body: `Dear {role},

I write as a constituent in {electorate} to raise concerns about education funding and pressures facing schools.

I urge you to support increased, needs-based school funding, better support for teachers, and genuine investment in early childhood education.

Yours sincerely,
A constituent`,
    },
  ],
  cost: [
    {
      subject: 'Cost of living is placing families under impossible pressure',
      body: `Dear {role},

I am writing as a constituent in {electorate} feeling the severe pressure of rising living costs.

Energy bills, groceries, rent, and mortgage repayments have all increased while wages have not kept pace. I urge you to support structural reforms that address inequality and make essential services affordable.

With respect,
A constituent in {electorate}`,
    },
  ],
  other: [
    {
      subject: 'Important concerns from a constituent in {electorate}',
      body: `Dear {role},

I am writing as one of your constituents in {electorate} to bring an important matter to your attention.

I would welcome the opportunity to discuss this further and hear your position. I trust that you take community concerns seriously.

I look forward to your response.

Yours sincerely,
A constituent in {electorate}`,
    },
  ],
};

export function getTemplateFallback(topic, salutation, electorate) {
  const tpls = TEMPLATES[topic] || TEMPLATES.other;
  const tpl  = tpls[Math.floor(Math.random() * tpls.length)];
  return {
    subject: tpl.subject.replace(/{electorate}/g, electorate),
    body:    tpl.body
               .replace(/{role}/g, salutation)
               .replace(/{electorate}/g, electorate),
  };
}
