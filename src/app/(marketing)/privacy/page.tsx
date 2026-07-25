import type { Metadata } from 'next';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = { title: `Privacy — ${BRAND.name}` };

const SECTIONS = [
  ['Data we process', `${BRAND.name} stores the workspace data you create — projects, leads, messages, knowledge base entries and settings. Your AI and email provider keys are stored to operate the service on your behalf and are never shared across accounts.`],
  ['How your data is used', 'Your data is used solely to provide the service: discovering and scoring leads, generating outreach, classifying replies and producing reports. We do not sell your data or use it to train third-party models.'],
  ['AI providers', 'When you run an AI action, the necessary context is sent to the provider you configured (OpenAI, Anthropic, Google or OpenRouter) using your own key. Their handling of that request is governed by their terms.'],
  ['Security', 'Every record is protected by row-level security and scoped to your workspace. Access requires authentication, and privileged operations run server-side only.'],
  ['Your rights', 'You can export or delete your data at any time. Deleting a project removes its leads, messages and knowledge base. Contact us to delete your account entirely.'],
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" sections={SECTIONS} />;
}

function LegalPage({ title, sections }: { title: string; sections: string[][] }) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-2xl px-5">
        <h1 className="text-[36px] font-black tracking-tight text-[#16121F]">{title}</h1>
        <p className="mt-2 text-[13px] text-[#9C97A8]">Last updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <div className="mt-10 space-y-8">
          {sections.map(([h, p]) => (
            <div key={h}>
              <h2 className="text-[20px] font-extrabold tracking-tight text-[#16121F]">{h}</h2>
              <p className="mt-2 text-[15.5px] leading-relaxed text-[#4a4557]">{p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
