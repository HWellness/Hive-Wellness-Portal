// Verification script for Jordan's real questionnaire import
export async function verifyJordanImport(storage: any) {
  console.log('🔍 Verifying Jordan\'s real questionnaire import...');

  try {
    // Get all questionnaires for Jordan
    const questionnaires = await storage.getTherapistMatchingQuestionnaires();
    const jordanQuestionnaires = questionnaires.filter((q: any) => 
      q.step2Email?.includes('jordan') || 
      q.step2FirstName?.toLowerCase() === 'jordan'
    );

    console.log('📊 Jordan questionnaires found:', jordanQuestionnaires.length);
    
    for (const q of jordanQuestionnaires) {
      console.log('📋 Questionnaire:', {
        id: q.id,
        name: `${q.step2FirstName} ${q.step2LastName}`,
        email: q.step2Email,
        gender: q.step4Gender,
        wellbeing: q.step6WellbeingRating,
        symptoms: q.step7MentalHealthSymptoms,
        supportAreas: q.step8SupportAreas,
        therapyTypes: q.step9TherapyTypes,
        previousTherapy: q.step10PreviousTherapy,
        createdAt: q.createdAt
      });
    }

    // Check if we have the real Jordan data
    const realJordan = jordanQuestionnaires.find((q: any) => 
      q.step2Email === 'jordan@realclient.com' &&
      q.step4Gender === 'Non-binary'
    );

    if (realJordan) {
      console.log('✅ Jordan\'s real data successfully imported!');
      return {
        success: true,
        realDataFound: true,
        questionnaireId: realJordan.id,
        details: realJordan
      };
    } else {
      console.log('⚠️ Real Jordan data not found, only test data exists');
      return {
        success: true,
        realDataFound: false,
        questionnaires: jordanQuestionnaires
      };
    }

  } catch (error) {
    console.error('❌ Error verifying Jordan import:', error);
    throw error;
  }
}