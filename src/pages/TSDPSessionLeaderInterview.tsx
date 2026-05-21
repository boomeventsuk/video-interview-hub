import DirectInterviewPage, { DirectInterviewConfig } from "@/components/direct-interview/DirectInterviewPage";

const tsdpSessionLeaderConfig: DirectInterviewConfig = {
  brandName: "The Silent Disco Project CIC",
  roleLabel: "School & Community Session Leader",
  heroTitle: "Some jobs look good on paper. This one looks good on people's faces.",
  heroCopy:
    "The Silent Disco Project CIC brings joy, movement and connection to schools, care homes, SEND groups and community settings across Northamptonshire. This quick one-way video step helps us get a feel for your warmth, confidence, practical judgement and availability.",
  storageFolder: "tsdp-session-leader",
  notifyEmail: "hello@thesilentdiscoproject.co.uk",
  notifyName: "The Silent Disco Project CIC",
  emailHeading: "New TSDP School & Community Session Leader video interview",
  emailSubjectPrefix: "School & Community Session Leader video interview",
  emailStorageLabel: "TSDP School & Community Session Leader",
  completeSentText: (name) => `Thanks, ${name}. Your video answers have been sent to The Silent Disco Project CIC.`,
  persistence: {
    templateId: "8d42b52e-32a8-4d25-9b97-cd40b738969f",
    warningLabel: "TSDP template",
    questionDbIds: {
      intro: "e142cf9a-916c-4abc-bd56-7ba89bb6ae23",
      why: "6cffd77e-3afb-45b8-9bff-b88538bdb2de",
      experience: "11e4acfd-bc5a-4a8a-89f4-2aec7e4a0552",
      practical: "d09c260d-fd0d-4269-aa57-c6d48420c585",
      availability: "5c1f2a9f-7241-42c2-a77c-6bb9a2f9ce90",
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
      text: "What interested you in the School & Community Session Leader role with The Silent Disco Project?",
    },
    {
      id: "experience",
      label: "Question 2",
      text: "Tell us about a time you led, supported or encouraged a group of people, especially children, older adults, SEND groups or a community setting.",
    },
    {
      id: "practical",
      label: "Question 3",
      text: "How would you create a warm, inclusive atmosphere for a group who may be nervous, shy or have mixed needs?",
    },
    {
      id: "availability",
      label: "Question 4",
      text: "This is freelance, ad hoc work across Northamptonshire. What is your availability like for evenings, weekends, Fridays or summer dates, and how would you reliably get to sessions with equipment?",
    },
  ],
};

export default function TSDPSessionLeaderInterview() {
  return <DirectInterviewPage config={tsdpSessionLeaderConfig} />;
}
