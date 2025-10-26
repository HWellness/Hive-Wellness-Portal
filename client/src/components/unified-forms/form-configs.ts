import { FormConfig } from './hive-form-system';

// Therapy Matching Questionnaire Configuration
export const therapyMatchingConfig: FormConfig = {
  id: 'therapy-matching',
  title: 'Therapy Matching Questionnaire',
  steps: [
    {
      id: 'age_verification',
      title: 'Are you 18 years old or over?',
      subtitle: 'You must be 18 or older to complete this questionnaire.',
      type: 'single-select',
      options: ['Yes, I am 18 or over', 'No, I am under 18'],
      validation: { required: true }
    },
    {
      id: 'location',
      title: 'Location',
      subtitle: 'This helps us match you with therapists in your area or available for online sessions.',
      type: 'text',
      validation: { required: true }
    },
    {
      id: 'age_range',
      title: 'How old are you?',
      subtitle: 'Select one',
      type: 'single-select',
      options: ['18-25', '26-35', '36-45', '46-55', '56-65', 'Over 65'],
      validation: { required: true }
    },
    {
      id: 'gender',
      title: 'How do you describe your gender?',
      type: 'single-select',
      options: ['Female', 'Male', 'Non-binary'],
      validation: { required: true }
    },
    {
      id: 'pronouns',
      title: 'What are your preferred pronouns?',
      type: 'single-select',
      options: ['She/Her/Hers', 'He/Him/His', 'They/Them/Theirs', 'Any pronouns', 'Prefer not to say'],
      validation: { required: true }
    },
    {
      id: 'wellbeing_scale',
      title: 'Current well-being and mental health',
      subtitle: 'On a scale of 1-10 how would you rate your overall well-being right now?',
      type: 'scale',
      validation: { required: true }
    },
    {
      id: 'mental_health_frequency',
      title: 'In the past two weeks, how often have you felt:',
      subtitle: 'Please rate each feeling on the scale: Never, Rarely, Sometimes, Often, Always',
      type: 'mental-health-symptoms',
      options: [
        'Overwhelmed and stressed',
        'Anxious or worried',
        'Sad or low in mood',
        'Disconnected from others',
        'Struggling with motivation'
      ],
      scale: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
      validation: { required: true }
    },
    {
      id: 'therapy_goals',
      title: 'What are your main goals for therapy?',
      subtitle: 'Please describe what you hope to achieve through therapy sessions.',
      type: 'textarea',
      validation: { required: true, minLength: 50 }
    },
    {
      id: 'therapy_experience',
      title: 'Have you had therapy before?',
      type: 'single-select',
      options: ['Yes, recently (within the last year)', 'Yes, but not recently', 'No, this is my first time'],
      validation: { required: true }
    },
    {
      id: 'preferences',
      title: 'Do you have any preferences for your therapist?',
      subtitle: 'Select all that apply',
      type: 'multi-select',
      options: [
        'Similar age range',
        'Same gender',
        'Experience with my specific concerns',
        'Particular therapeutic approach',
        'Cultural/ethnic background',
        'LGBTQ+ friendly',
        'No particular preferences'
      ]
    }
  ],
  automatedTriggers: {
    onCompletion: 'therapist-matching',
    conditions: {
      age_verification: 'Yes, I am 18 or over'
    }
  }
};

// Therapist Onboarding Configuration
export const therapistOnboardingConfig: FormConfig = {
  id: 'therapist-onboarding',
  title: 'Join Our Therapist Network',
  steps: [
    {
      id: 'personal_info',
      title: 'What is your full name?',
      type: 'text',
      validation: { required: true, minLength: 2 }
    },
    {
      id: 'email',
      title: 'Professional Email Address',
      subtitle: 'We\'ll use this for all professional communications',
      type: 'text',
      validation: { required: true }
    },
    {
      id: 'qualifications',
      title: 'What are your professional qualifications?',
      subtitle: 'Select all that apply',
      type: 'multi-select',
      options: [
        'Licensed Clinical Social Worker (LCSW)',
        'Licensed Marriage and Family Therapist (LMFT)',
        'Licensed Professional Counsellor (LPC)',
        'Licensed Mental Health Counsellor (LMHC)',
        'Psychologist (PhD/PsyD)',
        'Psychiatrist (MD)',
        'Other Professional License'
      ],
      validation: { required: true }
    },
    {
      id: 'experience_years',
      title: 'How many years of professional therapy experience do you have?',
      type: 'single-select',
      options: ['Less than 1 year', '1-3 years', '4-7 years', '8-15 years', 'More than 15 years'],
      validation: { required: true }
    },
    {
      id: 'specialisations',
      title: 'What are your areas of specialisation?',
      subtitle: 'Select all that apply',
      type: 'multi-select',
      options: [
        'Anxiety and Depression',
        'Trauma and PTSD',
        'Relationship and Couples Therapy',
        'Family Therapy',
        'Addiction and Substance Abuse',
        'Eating Disorders',
        'LGBTQ+ Issues',
        'Grief and Loss',
        'Child and Adolescent Therapy',
        'Career and Life Transitions'
      ],
      validation: { required: true }
    },
    {
      id: 'therapeutic_approaches',
      title: 'What therapeutic approaches do you use?',
      subtitle: 'Select all that apply',
      type: 'multi-select',
      options: [
        'Cognitive Behavioural Therapy (CBT)',
        'Dialectical Behavioural Therapy (DBT)',
        'Acceptance and Commitment Therapy (ACT)',
        'Psychodynamic Therapy',
        'Humanistic/Person-Centered',
        'Family Systems Therapy',
        'Mindfulness-Based Approaches',
        'Solution-Focused Brief Therapy',
        'EMDR',
        'Other Approaches'
      ],
      validation: { required: true }
    },
    {
      id: 'availability',
      title: 'What is your preferred session schedule?',
      type: 'single-select',
      options: [
        'Full-time (30+ hours per week)',
        'Part-time (15-29 hours per week)',
        'Limited (5-14 hours per week)',
        'As needed basis'
      ],
      validation: { required: true }
    },
    {
      id: 'bio',
      title: 'Professional Bio',
      subtitle: 'Please provide a brief professional biography that clients will see (minimum 100 words)',
      type: 'textarea',
      validation: { required: true, minLength: 100, maxLength: 500 }
    }
  ],
  automatedTriggers: {
    onCompletion: 'therapist-onboarding'
  }
};

// Contact Form Configuration
export const contactFormConfig: FormConfig = {
  id: 'contact-form',
  title: 'Get in Touch',
  steps: [
    {
      id: 'contact_type',
      title: 'How can we help you?',
      type: 'single-select',
      options: [
        'I have questions about therapy services',
        'I want to join as a therapist',
        'I need technical support',
        'I have billing questions',
        'Other inquiry'
      ],
      validation: { required: true }
    },
    {
      id: 'name',
      title: 'What is your name?',
      type: 'text',
      validation: { required: true }
    },
    {
      id: 'email',
      title: 'Email Address',
      type: 'text',
      validation: { required: true }
    },
    {
      id: 'message',
      title: 'How can we help you?',
      subtitle: 'Please provide details about your inquiry',
      type: 'textarea',
      validation: { required: true, minLength: 20 }
    }
  ],
  automatedTriggers: {
    onCompletion: 'admin-review'
  }
};

// University DSA Configuration
export const universityDSAConfig: FormConfig = {
  id: 'university-dsa',
  title: 'University DSA Partnership',
  steps: [
    {
      id: 'university_name',
      title: 'University/Institution Name',
      type: 'text',
      validation: { required: true }
    },
    {
      id: 'contact_person',
      title: 'Primary Contact Person',
      type: 'text',
      validation: { required: true }
    },
    {
      id: 'position',
      title: 'Your Position/Title',
      type: 'text',
      validation: { required: true }
    },
    {
      id: 'email',
      title: 'Official Email Address',
      type: 'text',
      validation: { required: true }
    },
    {
      id: 'student_population',
      title: 'Approximate Student Population',
      type: 'single-select',
      options: ['Under 5,000', '5,000-15,000', '15,000-30,000', '30,000-50,000', 'Over 50,000'],
      validation: { required: true }
    },
    {
      id: 'services_interest',
      title: 'Which services are you interested in?',
      subtitle: 'Select all that apply',
      type: 'multi-select',
      options: [
        'Individual Therapy for Students',
        'Crisis Intervention Support',
        'Mental Health Workshops',
        'Staff Training Programs',
        'Custom Partnership Solutions'
      ],
      validation: { required: true }
    },
    {
      id: 'timeline',
      title: 'When would you like to implement services?',
      type: 'single-select',
      options: [
        'Immediately',
        'Next Academic Quarter/Semester',
        'Next Academic Year',
        'Still exploring options'
      ],
      validation: { required: true }
    },
    {
      id: 'additional_info',
      title: 'Additional Information',
      subtitle: 'Please provide any additional details about your needs or questions',
      type: 'textarea'
    }
  ],
  automatedTriggers: {
    onCompletion: 'admin-review'
  }
};