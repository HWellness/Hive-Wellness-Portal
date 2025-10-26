export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  priority: number;
}

export const faqData: FAQEntry[] = [
  {
    id: 'onboarding-1',
    question: 'How do I get started with Hive Wellness?',
    answer: 'Just fill out our quick questionnaire and we\'ll match you with suitable therapists. Then you can book a free 20-minute consultation to see if it\'s a good fit!',
    keywords: ['getting started', 'onboarding', 'sign up', 'create account', 'begin'],
    category: 'onboarding',
    priority: 1
  },
  {
    id: 'onboarding-2',
    question: 'What information do I need to provide during registration?',
    answer: 'During registration, you\'ll need to provide basic contact information, your therapy goals and preferences, any relevant background information about your mental health needs, and your availability for sessions. All information is kept strictly confidential.',
    keywords: ['registration', 'information needed', 'sign up process', 'personal details'],
    category: 'onboarding',
    priority: 1
  },
  {
    id: 'therapy-1',
    question: 'What types of therapy do you offer?',
    answer: 'We help with anxiety, depression, relationships, trauma, and work stress. Our therapists use approaches like CBT, counselling, and mindfulness. Would you like to start with our questionnaire to see how we can help?',
    keywords: ['therapy types', 'CBT', 'approaches', 'specialisations', 'treatment'],
    category: 'therapy',
    priority: 1
  },
  {
    id: 'therapy-2',
    question: 'How long are therapy sessions?',
    answer: 'Standard therapy sessions are 50 minutes long with a 10-minute buffer. This is the industry standard that allows for meaningful therapeutic work while maintaining a manageable schedule.',
    keywords: ['session length', 'duration', 'how long', 'time', 'minutes'],
    category: 'therapy',
    priority: 1
  },
  {
    id: 'therapy-3',
    question: 'Are sessions conducted online or in person?',
    answer: 'All our therapy sessions are online through secure video calls. This means you can connect with qualified therapists from the comfort of your own home!',
    keywords: ['online', 'video', 'in person', 'remote', 'virtual', 'face to face', 'location'],
    category: 'therapy',
    priority: 1
  },
  {
    id: 'therapy-4',
    question: 'Do you offer face-to-face or in-person therapy appointments?',
    answer: 'Hive Wellness specialises exclusively in online video therapy sessions. We do not offer in-person appointments as our service is designed around secure, convenient video sessions that connect you with qualified therapists across the UK. This approach ensures you have access to the best-matched therapist for your needs, regardless of geographical location.',
    keywords: ['face to face', 'in person', 'physical appointments', 'office visits', 'location', 'meet in person'],
    category: 'therapy',
    priority: 1
  },
  {
    id: 'matching-1',
    question: 'How are therapists matched to clients?',
    answer: 'Our matching process combines your preferences, therapy needs, and goals with our therapists\' specialisations and approaches. We use both AI-assisted matching and human oversight to ensure the best possible therapeutic relationship.',
    keywords: ['matching', 'therapist selection', 'pairing', 'assignment'],
    category: 'matching',
    priority: 1
  },
  {
    id: 'matching-2',
    question: 'Can I request a different therapist if needed?',
    answer: 'Absolutely! The therapeutic relationship is crucial for successful outcomes. If you feel you\'re not well-matched with your current therapist, you can request a change at any time. We\'ll work to find a better fit for your needs.',
    keywords: ['change therapist', 'different therapist', 'switch', 'not working'],
    category: 'matching',
    priority: 1
  },
  {
    id: 'privacy-1',
    question: 'How is my privacy protected?',
    answer: 'We take privacy seriously. All sessions are conducted through encrypted video technology, your personal information is securely stored and protected, and we follow strict confidentiality protocols. Only you and your therapist have access to your session content.',
    keywords: ['privacy', 'confidentiality', 'security', 'protected', 'safe'],
    category: 'privacy',
    priority: 1
  },
  {
    id: 'privacy-2',
    question: 'Who can access my therapy records?',
    answer: 'Your therapy records are strictly confidential and can only be accessed by you and your assigned therapist. We do not share your information with third parties without your explicit consent, except as required by law.',
    keywords: ['records', 'access', 'confidential', 'who can see', 'sharing'],
    category: 'privacy',
    priority: 1
  },
  {
    id: 'booking-1',
    question: 'How do I book a therapy session?',
    answer: 'Once you\'re matched with a therapist, you can book sessions through your client dashboard. You\'ll see your therapist\'s available times and can select slots that work for your schedule. You\'ll receive confirmation and reminder emails.',
    keywords: ['booking', 'schedule', 'appointment', 'reserve', 'book session'],
    category: 'booking',
    priority: 1
  },
  {
    id: 'booking-2',
    question: 'Can I cancel or reschedule sessions?',
    answer: 'Yes, you can cancel or reschedule sessions through your dashboard. Please provide at least 24 hours\' notice when possible to avoid cancellation fees and to allow your therapist to offer the slot to other clients.',
    keywords: ['cancel', 'reschedule', 'change appointment', 'modify booking'],
    category: 'booking',
    priority: 1
  },
  {
    id: 'payment-1',
    question: 'How much do therapy sessions cost?',
    answer: 'Our sessions cost £65, £80, £90, or £120 depending on your therapist\'s experience and specialisation. Everything starts with a free 20-minute consultation to make sure you\'re a good match!',
    keywords: ['cost', 'price', 'fee', 'payment', 'how much', 'expensive'],
    category: 'payment',
    priority: 1
  },
  {
    id: 'payment-2',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards through our secure payment system powered by Stripe. Payments are processed securely and you\'ll receive receipts for all transactions.',
    keywords: ['payment methods', 'cards', 'how to pay', 'stripe', 'credit card'],
    category: 'payment',
    priority: 1
  },
  {
    id: 'technical-1',
    question: 'What do I need for video sessions?',
    answer: 'You\'ll need a device with a camera and microphone (computer, tablet, or smartphone), a stable internet connection, and access to our secure platform. We recommend using headphones for better audio quality and privacy.',
    keywords: ['technical requirements', 'equipment', 'video call', 'camera', 'internet'],
    category: 'technical',
    priority: 1
  },
  {
    id: 'technical-2',
    question: 'What if I have technical problems during a session?',
    answer: 'If you experience technical difficulties, try refreshing your browser first. If problems persist, you can contact our support team at support@hive-wellness.co.uk who will help resolve issues quickly. Sessions can be rescheduled if technical problems cannot be resolved.',
    keywords: ['technical problems', 'issues', 'not working', 'help', 'support'],
    category: 'technical',
    priority: 1
  },
  {
    id: 'support-1',
    question: 'How can I contact support?',
    answer: 'If you experience technical difficulties, try refreshing your browser first. If problems persist, you can contact our support team at support@hive-wellness.co.uk who will help resolve issues quickly. Sessions can be rescheduled if technical problems cannot be resolved. We aim to respond to all inquiries within 24 hours.',
    keywords: ['support', 'contact', 'help', 'assistance', 'questions'],
    category: 'support',
    priority: 1
  },
  {
    id: 'emergency-1',
    question: 'What should I do in a mental health emergency?',
    answer: 'If you\'re experiencing a mental health emergency, please contact emergency services immediately (999 in the UK) or go to your nearest A&E department. Our platform is not designed for emergency situations. You can also contact the Samaritans at 116 123 for free 24/7 support.',
    keywords: ['emergency', 'crisis', 'urgent', 'immediate help', '999'],
    category: 'emergency',
    priority: 1
  },
  {
    id: 'frequency-1',
    question: 'How often should I have therapy sessions?',
    answer: 'Session frequency depends on your individual needs and goals. Many clients start with weekly sessions, while others may benefit from bi-weekly or monthly sessions. Your therapist will work with you to determine the most appropriate schedule.',
    keywords: ['frequency', 'how often', 'weekly', 'schedule', 'regular'],
    category: 'therapy',
    priority: 1
  },
  {
    id: 'platform-1',
    question: 'How do I navigate the Hive Wellness platform after signing up?',
    answer: 'I can\'t help with existing bookings or accounts. For support with that, please contact our team directly. If you\'re interested in getting started with therapy, I\'d be happy to help!',
    keywords: ['navigate', 'platform', 'dashboard', 'how to use', 'interface'],
    category: 'platform',
    priority: 1
  },
  {
    id: 'platform-2',
    question: 'What happens after I complete the intake questionnaire?',
    answer: 'Once you complete the questionnaire, our team reviews your responses and provides 3-5 carefully matched therapists within 24-48 hours. You\'ll receive an email notification and can view your matches in your dashboard, where you can read therapist profiles and book consultations.',
    keywords: ['questionnaire', 'after completing', 'what happens next', 'matching process'],
    category: 'platform',
    priority: 1
  },
  {
    id: 'platform-3',
    question: 'How do I book my first session?',
    answer: 'To book your free 15-20 minute introduction call, click the "Book Free Call" button on our homepage! During this call, you can discuss your needs with our team and we\'ll help match you with the right therapist. After that, you can schedule your first full therapy session.',
    keywords: ['book session', 'first appointment', 'consultation', 'scheduling'],
    category: 'platform',
    priority: 1
  },
  {
    id: 'platform-4',
    question: 'Where can I find my appointment details and join video sessions?',
    answer: 'All your appointments are listed in the "Appointments" section of your dashboard. You\'ll see upcoming sessions, past sessions, and can join video calls directly from there. You\'ll also receive email reminders with join links.',
    keywords: ['appointments', 'video sessions', 'join call', 'where to find'],
    category: 'platform',
    priority: 1
  },
  {
    id: 'platform-5',
    question: 'Can I message my therapist between sessions?',
    answer: 'Yes, you can send messages to your therapist through the secure messaging system in your dashboard. Please note that all messages are monitored by Hive Wellness staff for safety purposes. Response times may vary depending on your therapist\'s availability.',
    keywords: ['messaging', 'contact therapist', 'between sessions', 'messages'],
    category: 'platform',
    priority: 1
  },
  {
    id: 'platform-6',
    question: 'How do I update my profile or preferences?',
    answer: 'You can update your profile information, therapy preferences, and personal details by going to the "Profile" section in your dashboard. Changes to your therapy preferences may trigger new therapist recommendations if needed.',
    keywords: ['update profile', 'change preferences', 'edit information', 'profile settings'],
    category: 'platform',
    priority: 1
  },
  {
    id: 'booking-3',
    question: 'How do I book a free consultation or introduction call?',
    answer: 'You can book your free 15-20 minute introduction call through our website! Look for the "Book Free Call" button on the homepage, or visit our portal where you\'ll find the booking option. This is where you\'ll chat with our team and get matched with the right therapist for you!',
    keywords: ['book consultation', 'free call', 'introduction call', 'book free consultation', 'free 15 minute', 'free 20 minute', 'free appointment', 'book intro call', 'how to book', 'where to book'],
    category: 'booking',
    priority: 1
  },
  {
    id: 'categories-1',
    question: 'What are the different therapy categories and how do I choose?',
    answer: 'We offer different therapy categories with sessions starting at a minimum of £65. Your therapist\'s fee depends on their experience, qualifications, and specialisation. Your questionnaire responses help us recommend the most suitable therapist and category for your needs.',
    keywords: ['therapy categories', 'pricing tiers', 'choose category', 'cost levels'],
    category: 'pricing',
    priority: 1
  },
  {
    id: 'matching-3',
    question: 'What if I\'m not happy with my therapist matches?',
    answer: 'If you\'re not satisfied with your initial matches, you can request new recommendations through your dashboard. Our team will review your preferences again and provide alternative options. You can also update your questionnaire responses to refine the matching process.',
    keywords: ['not happy', 'different matches', 'new recommendations', 'change matches'],
    category: 'matching',
    priority: 1
  },
  {
    id: 'help-1',
    question: 'I\'m having trouble with the platform. Where can I get help?',
    answer: 'For technical issues, you can contact our support team through the "Help" section in your dashboard, or by emailing support. For urgent technical problems during sessions, try refreshing your browser first, then contact support immediately.',
    keywords: ['help', 'support', 'technical issues', 'problems', 'trouble'],
    category: 'support',
    priority: 1
  },
  {
    id: 'video-1',
    question: 'How do I prepare for my first video session?',
    answer: 'Before your session: test your camera and microphone, ensure you have a stable internet connection, find a quiet private space, and log in 5 minutes early. The join button will appear in your dashboard 10 minutes before your appointment time.',
    keywords: ['prepare', 'first session', 'video call', 'before appointment'],
    category: 'video',
    priority: 1
  },
  {
    id: 'therapy-frequency-1',
    question: 'How often should I attend therapy sessions?',
    answer: 'The frequency of therapy sessions depends on your individual needs and goals. Most people benefit from weekly sessions initially, though some may need more or less frequent appointments. Your therapist will work with you to determine the optimal schedule for your situation.',
    keywords: ['frequency', 'how often', 'weekly', 'schedule', 'regular'],
    category: 'therapy',
    priority: 2
  },
  {
    id: 'effectiveness-1',
    question: 'How long does therapy typically take to show results?',
    answer: 'Everyone\'s therapy journey is different. Some people notice improvements after a few sessions, while others may need several months of consistent work. Your therapist will regularly review your progress and adjust the approach as needed.',
    keywords: ['results', 'how long', 'progress', 'effectiveness', 'improvement'],
    category: 'therapy',
    priority: 2
  },
  {
    id: 'qualifications-1',
    question: 'What qualifications do your therapists have?',
    answer: 'All our therapists are qualified mental health professionals with relevant degrees and certifications. They are registered with professional bodies such as the BACP (British Association for Counselling and Psychotherapy) and undergo regular supervision and continuing professional development.',
    keywords: ['qualifications', 'credentials', 'certified', 'professional', 'BACP'],
    category: 'therapists',
    priority: 2
  }
];

export function searchFAQ(query: string): FAQEntry[] {
  const normalizedQuery = query.toLowerCase();
  
  return faqData
    .filter(faq => {
      const questionMatch = faq.question.toLowerCase().includes(normalizedQuery);
      const answerMatch = faq.answer.toLowerCase().includes(normalizedQuery);
      const keywordMatch = faq.keywords.some(keyword => 
        keyword.toLowerCase().includes(normalizedQuery) || 
        normalizedQuery.includes(keyword.toLowerCase())
      );
      
      return questionMatch || answerMatch || keywordMatch;
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5); // Return top 5 matches
}