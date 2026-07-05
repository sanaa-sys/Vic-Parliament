// src/data/templates.js
// Fallback email templates used when the AI API is unavailable.
// Each paragraph separated by \n\n for proper spacing.
// Sign-off is always "Yours sincerely,\n\nA constituent" — no electorate appended.

export const TEMPLATES = {
  islamophobia: [
    {
      subject: 'Addressing anti-Muslim hate in our community',
      body: `{role}

I am writing to raise my deep concern about the rise of Islamophobia and anti-Muslim hate in Australia.

Muslim Australians face discrimination, harassment, and vilification in their daily lives. The United Nations' International Day to Combat Islamophobia on 15 March marks the anniversary of the 2019 Christchurch mosque shootings, a tragedy that must never be forgotten.

I urge you to:
• Publicly condemn anti-Muslim hate speech and Islamophobia
• Support stronger legislation against religious vilification
• Advocate for proper resourcing of the Office of the Special Envoy to Combat Islamophobia
• Engage meaningfully with Muslim community organisations in your electorate

I look forward to your response.

Yours sincerely,

A constituent`,
    },
    {
      subject: 'Your position on combating Islamophobia',
      body: `{role}

As your constituent, I am writing to ask you to take a strong public stand against Islamophobia and anti-Muslim hate.

Every Victorian has the right to live, work, and practise their faith free from discrimination and fear. Yet Muslim Australians continue to experience systemic prejudice, hate crimes, and media vilification.

I call on you to:
• Speak out against Islamophobia at every opportunity
• Support community-led anti-racism initiatives
• Push for better data collection on anti-Muslim hate crimes
• Ensure Muslim voices are heard in policy decisions that affect them

Yours sincerely,

A constituent`,
    },
  ],
  international: [
    {
      subject: "Australia's international responsibilities",
      body: `{role}

I am writing to raise matters of international concern that require Australia's leadership.

Australia has a proud tradition of championing human rights and international law. I believe we must continue to uphold these values on the world stage, particularly at a time when they are under threat.

I urge you to:
• Champion Australia's obligations under international humanitarian law
• Support accountability mechanisms for human rights violations globally
• Advocate for a foreign policy that prioritises human dignity
• Ensure Australia's voice is heard in multilateral forums on peace and justice

Yours sincerely,

A constituent`,
    },
  ],
  climate: [
    {
      subject: 'Urgent action needed on climate policy',
      body: `{role}

I am writing to urge stronger action on the climate crisis facing Victoria and Australia.

Our state is already experiencing longer heatwaves, more intense bushfires, and unpredictable weather patterns. The science is clear — we must act now to protect our communities and our environment for future generations.

I ask you to:
• Champion stronger emissions reduction targets
• Accelerate the transition to renewable energy
• Oppose new fossil fuel projects
• Support communities most affected by climate change

Yours sincerely,

A constituent`,
    },
  ],
  housing: [
    {
      subject: 'Housing affordability is at crisis point',
      body: `{role}

I am writing to express my serious concern about the housing affordability crisis affecting Victorians.

Rents have surged beyond what ordinary workers can afford, and home ownership is increasingly out of reach for many. This is creating real hardship for families, young people, and low-income earners across our community.

I urge you to:
• Support policies that increase social and affordable housing supply
• Strengthen renters' rights and protections
• Address speculative investment that drives up prices
• Invest in homelessness prevention and support services

Yours sincerely,

A constituent`,
    },
  ],
  health: [
    {
      subject: 'Our healthcare system needs urgent investment',
      body: `{role}

I am writing to raise concerns about the growing strain on Victoria's healthcare system.

Wait times are dangerously long, GPs are under immense pressure, and mental health services remain chronically underfunded. Every Victorian deserves timely access to quality healthcare, regardless of where they live or their financial situation.

I urge you to:
• Advocate for increased hospital funding and resources
• Expand bulk billing and reduce out-of-pocket costs
• Invest meaningfully in mental health care
• Support the healthcare workforce to address shortages

Yours sincerely,

A constituent`,
    },
  ],
  transport: [
    {
      subject: 'Public transport needs urgent improvement',
      body: `{role}

I am writing about the inadequate state of public transport and the impact it is having on our community.

Frequent cancellations, poor frequency, and overcrowded services make it difficult for people to get around without a car. A reliable, affordable public transport network is essential for a growing city like Melbourne.

I ask you to:
• Advocate for increased investment in rail and bus services
• Push for more frequent and reliable services across all suburbs
• Support more affordable fares, particularly for low-income households and students
• Develop a comprehensive transport plan that serves all communities

Yours sincerely,

A constituent`,
    },
  ],
  education: [
    {
      subject: 'Education funding must be a priority',
      body: `{role}

I am writing to raise concerns about education funding and the pressures facing schools and students across Victoria.

Teachers are overstretched, resources are stretched thin, and many students — particularly those in disadvantaged communities — are not receiving the support they need to thrive.

I urge you to:
• Support increased, needs-based school funding
• Invest in better support and conditions for teachers
• Prioritise early childhood education as a long-term investment
• Ensure every student has access to the resources they need

Yours sincerely,

A constituent`,
    },
  ],
  cost: [
    {
      subject: 'Cost of living is placing families under impossible pressure',
      body: `{role}

I am writing to share my concern about the severe cost of living pressures being felt across our community.

Energy bills, groceries, rent, and mortgage repayments have all increased significantly while wages have not kept pace. Many families are making impossible choices between essentials, and the most vulnerable in our community are being left behind.

I urge you to:
• Support structural reforms that address inequality
• Make essential services — energy, healthcare, transport — more affordable
• Strengthen social safety nets for those most in need
• Hold corporations accountable for price gouging

Yours sincerely,

A constituent`,
    },
  ],
  other: [
    {
      subject: 'Important concerns from a constituent',
      body: `{role}

I am writing as one of your constituents to bring an important matter to your attention.

The issue I wish to raise has a real impact on the lives of people in our community. I believe it deserves your serious consideration and a thoughtful response.

I would welcome the opportunity to discuss this further and hear your position on the matter. I trust that you take community concerns seriously and look forward to your response.

Yours sincerely,

A constituent`,
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
