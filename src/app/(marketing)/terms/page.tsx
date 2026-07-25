import type { Metadata } from 'next';
import { BRAND } from '@/lib/constants';

export const metadata: Metadata = { title: `Terms — ${BRAND.name}` };

const SECTIONS = [
  ['Acceptance', `By using ${BRAND.name} you agree to these terms. If you use the service on behalf of an organisation, you accept them for that organisation.`],
  ['Your account', 'You are responsible for activity under your account and for keeping your credentials and provider keys secure. Do not use the service for unlawful outreach or to send messages that violate anti-spam laws in your recipients’ jurisdictions.'],
  ['Acceptable use', 'You agree to send only outreach you are legally permitted to send, to honour unsubscribe requests, and to comply with applicable email and privacy regulations. You are responsible for the content you approve and send.'],
  ['AI output', 'AI-generated content may contain errors. You are responsible for reviewing outreach and replies before they are sent. Grounding the agent in an accurate knowledge base reduces, but does not eliminate, this risk.'],
  ['Billing', 'Paid plans are billed in advance. AI and email provider costs are billed by those providers directly under your own keys. You may cancel at any time; access continues until the end of the billing period.'],
  ['Liability', 'The service is provided “as is”. To the extent permitted by law, we are not liable for indirect or consequential damages arising from use of the service.'],
];

export default function TermsPage() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-2xl px-5">
        <h1 className="text-[36px] font-black tracking-tight text-[#16121F]">Terms of Service</h1>
        <p className="mt-2 text-[13px] text-[#9C97A8]">Last updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map(([h, p]) => (
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
