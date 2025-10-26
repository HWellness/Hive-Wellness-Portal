import fetch from 'node-fetch';

// Comprehensive email delivery test
async function testEmailDelivery() {
  console.log('🧪 COMPREHENSIVE EMAIL DELIVERY TEST');
  console.log('=====================================\n');

  try {
    // Test 1: Direct SendGrid test via admin console
    console.log('📧 Test 1: Admin Console Email Test');
    const adminEmailTest = await fetch('http://localhost:5000/api/admin/communications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=demo-admin-session'
      },
      body: JSON.stringify({
        to: 'support@hive-wellness.co.uk',
        subject: 'Test Email - Admin Console',
        message: 'This is a test email sent from the admin console to verify email delivery.',
        type: 'email'
      })
    });

    const adminResult = await adminEmailTest.json();
    console.log('Admin Email Test Result:', adminResult);

    // Test 2: Form submission notification
    console.log('\n📧 Test 2: Form Submission Notification');
    const formSubmissionTest = await fetch('http://localhost:5000/api/therapist-onboarding/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Therapist',
        email: 'test.therapist@example.com',
        phoneNumber: '+44 7700 900123',
        dateOfBirth: '1985-01-01',
        streetAddress: '123 Test Street',
        postCode: 'TE1 2ST',
        jobTitle: 'Clinical Psychologist',
        qualifications: ['PhD Psychology'],
        yearsOfExperience: 5,
        registrationNumber: 'TEST12345'
      })
    });

    const formResult = await formSubmissionTest.json();
    console.log('Form Submission Test Result:', formResult);

    // Test 3: WordPress form webhook
    console.log('\n📧 Test 3: WordPress Form Webhook');
    const wpFormTest = await fetch('http://localhost:5000/api/external/gravity-forms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        form_id: '2',
        form_title: 'Test Lead Capture',
        entry_id: '999',
        entry_data: {
          email: 'test.client@example.com',
          first_name: 'Test',
          last_name: 'Client',
          message: 'Testing email notifications'
        }
      })
    });

    const wpResult = await wpFormTest.json();
    console.log('WordPress Form Test Result:', wpResult);

    // Test 4: Check SendGrid configuration
    console.log('\n🔧 Test 4: SendGrid Configuration Check');
    const sgConfigTest = await fetch('http://localhost:5000/api/admin/system/email-config-test', {
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=demo-admin-session'
      }
    });

    if (sgConfigTest.status === 200) {
      const sgResult = await sgConfigTest.json();
      console.log('SendGrid Config Test Result:', sgResult);
    } else {
      console.log('SendGrid Config Test: Endpoint not available');
    }

    console.log('\n✅ EMAIL DELIVERY TEST COMPLETE');
    console.log('=====================================');
    console.log('Check your support@hive-wellness.co.uk inbox for test emails');

  } catch (error) {
    console.error('Email test error:', error);
  }
}

testEmailDelivery();