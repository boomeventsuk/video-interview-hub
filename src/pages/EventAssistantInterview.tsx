import DirectInterviewPage, { DirectInterviewConfig } from "@/components/direct-interview/DirectInterviewPage";

const eventAssistantConfig: DirectInterviewConfig = {
  brandName: "Boombastic Events",
  roleLabel: "Event Assistant",
  heroTitle: "Casual Event Assistant work in Northampton and surrounding areas.",
  heroCopy:
    "Thanks for applying. This is a quick one-way video step so we can get a feel for your personality, practical experience and availability before booking final video calls.",
  storageFolder: "boombastic-event-assistant",
  notifyEmail: "hello@boomevents.co.uk",
  notifyName: "Boombastic Events",
  emailHeading: "New Boombastic Event Assistant video interview",
  emailSubjectPrefix: "Event Assistant video interview",
  emailStorageLabel: "Boombastic Event Assistant",
  completeSentText: (name) => `Thanks, ${name}. Your video answers have been sent to Boombastic Events.`,
  persistence: {
    templateId: "47ec094e-58d5-4fd4-a70f-519b76df3a20",
    warningLabel: "Boombastic Event Assistant template",
    questionDbIds: {
      intro: "c07cc8dd-827f-4896-954f-12b569028dde",
      why: "f735c779-dd3c-48fb-8ac5-83274d7bab44",
      experience: "bc1ec95b-7f1f-4bb0-a75c-b161a9869b5a",
      practical: "796113ba-20af-4c25-a1c0-621f0a6f4b8e",
      availability: "80297174-1692-493b-bcab-421a091d7a3c",
    },
  },
  questions: [
    {
      id: "intro",
      label: "Intro",
      text: "Quick intro: your name, where you're based, and what you're doing at the moment.",
    },
    {
      id: "why",
      label: "Question 1",
      text: "What interested you in casual Event Assistant work with Boombastic Events?",
    },
    {
      id: "experience",
      label: "Question 2",
      text: "What experience have you had in events, hospitality, venues, customer service, content, or busy public-facing work?",
    },
    {
      id: "practical",
      label: "Question 3",
      text: "Tell us how you would help on a busy event day where there is setup, guests arriving, door scanning, quick bits of content, and packdown.",
    },
    {
      id: "availability",
      label: "Question 4",
      text: "What is your availability like for ad hoc daytime, evening and weekend events, and how would you reliably get to Northampton and surrounding areas?",
    },
  ],
};

export default function EventAssistantInterview() {
  return <DirectInterviewPage config={eventAssistantConfig} />;
}
