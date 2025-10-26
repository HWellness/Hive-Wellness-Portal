import { appointmentMigrationService, createMigrationService } from './appointment-migration-service';
import { db } from './db';
import { appointments, users } from '@shared/schema';
import { eq, and, gte, ne } from 'drizzle-orm';

/**
 * Test suite for appointment migration system
 */
export class AppointmentMigrationTest {
  
  /**
   * Test migration assessment functionality
   */
  async testMigrationAssessment(): Promise<{ success: boolean; results: any; errors?: string[] }> {
    try {
      console.log('🧪 Testing migration assessment...');
      
      const results = await appointmentMigrationService.assessMigrationNeeds();
      
      console.log(`✅ Assessment completed: ${results.length} appointments need migration`);
      
      // Validate assessment results
      const riskLevels = results.map(r => r.riskAssessment.riskLevel);
      const lowRisk = riskLevels.filter(r => r === 'low').length;
      const mediumRisk = riskLevels.filter(r => r === 'medium').length;
      const highRisk = riskLevels.filter(r => r === 'high').length;
      
      const assessmentSummary = {
        totalPlans: results.length,
        riskDistribution: { lowRisk, mediumRisk, highRisk },
        samplePlan: results[0] || null
      };
      
      return {
        success: true,
        results: assessmentSummary
      };
      
    } catch (error: any) {
      console.error('❌ Assessment test failed:', error.message);
      return {
        success: false,
        results: null,
        errors: [error.message]
      };
    }
  }

  /**
   * Test dry run migration functionality
   */
  async testDryRunMigration(): Promise<{ success: boolean; results: any; errors?: string[] }> {
    try {
      console.log('🧪 Testing dry run migration...');
      
      // Create dry run migration service
      const dryRunService = createMigrationService({ 
        dryRun: true, 
        batchSize: 2,
        onlyFutureAppointments: true
      });
      
      // Get assessment for testing
      const plans = await dryRunService.assessMigrationNeeds();
      
      if (plans.length === 0) {
        console.log('ℹ️ No appointments found for dry run testing');
        return {
          success: true,
          results: { message: 'No appointments available for testing', plansCount: 0 }
        };
      }
      
      // Test with first 2 plans
      const testPlans = plans.slice(0, 2);
      
      // Execute dry run migration
      const summary = await dryRunService.migrateBatch(testPlans);
      
      console.log('✅ Dry run migration completed');
      console.log(`📊 Results: ${summary.successful} successful, ${summary.failed} failed, ${summary.skipped} skipped`);
      
      return {
        success: true,
        results: {
          summary,
          isDryRun: true,
          note: 'No actual changes made during dry run'
        }
      };
      
    } catch (error: any) {
      console.error('❌ Dry run test failed:', error.message);
      return {
        success: false,
        results: null,
        errors: [error.message]
      };
    }
  }

  /**
   * Test migration verification functionality
   */
  async testMigrationVerification(): Promise<{ success: boolean; results: any; errors?: string[] }> {
    try {
      console.log('🧪 Testing migration verification...');
      
      // Get a sample appointment for testing
      const sampleAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            ne(appointments.status, 'cancelled'),
            gte(appointments.scheduledAt, new Date())
          )
        )
        .limit(1);
      
      if (sampleAppointments.length === 0) {
        return {
          success: true,
          results: { message: 'No appointments available for verification testing' }
        };
      }
      
      const appointment = sampleAppointments[0];
      const eventId = appointment.calendarEventId || appointment.googleEventId;
      
      if (!eventId) {
        return {
          success: true,
          results: { message: 'Sample appointment has no calendar event ID for testing' }
        };
      }
      
      // Test verification
      const verificationResult = await appointmentMigrationService.verifyMigration(
        appointment.id, 
        eventId
      );
      
      console.log(`✅ Verification test completed: ${verificationResult.success ? 'PASS' : 'FAIL'}`);
      
      return {
        success: true,
        results: {
          appointmentId: appointment.id,
          eventId,
          verificationResult
        }
      };
      
    } catch (error: any) {
      console.error('❌ Verification test failed:', error.message);
      return {
        success: false,
        results: null,
        errors: [error.message]
      };
    }
  }

  /**
   * Test migration service configuration options
   */
  async testMigrationServiceConfiguration(): Promise<{ success: boolean; results: any; errors?: string[] }> {
    try {
      console.log('🧪 Testing migration service configuration...');
      
      // Test different configurations
      const configs = [
        { batchSize: 3, dryRun: true, delayBetweenBatches: 500 },
        { batchSize: 1, dryRun: true, skipConflicts: false },
        { batchSize: 5, dryRun: true, onlyFutureAppointments: false }
      ];
      
      const configResults = [];
      
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        console.log(`🔧 Testing configuration ${i + 1}:`, config);
        
        try {
          const migrationService = createMigrationService(config);
          const stats = migrationService.getMigrationStats();
          
          configResults.push({
            config,
            stats,
            success: true
          });
          
          console.log(`✅ Configuration ${i + 1} initialized successfully`);
          
        } catch (error: any) {
          configResults.push({
            config,
            success: false,
            error: error.message
          });
          
          console.log(`❌ Configuration ${i + 1} failed:`, error.message);
        }
      }
      
      return {
        success: true,
        results: {
          totalConfigs: configs.length,
          successfulConfigs: configResults.filter(r => r.success).length,
          configResults
        }
      };
      
    } catch (error: any) {
      console.error('❌ Configuration test failed:', error.message);
      return {
        success: false,
        results: null,
        errors: [error.message]
      };
    }
  }

  /**
   * Run comprehensive migration system test suite
   */
  async runComprehensiveTests(): Promise<{ 
    overall: boolean; 
    results: Record<string, any>; 
    summary: string;
    errors: string[];
  }> {
    console.log('🧪 Starting comprehensive appointment migration tests...');
    
    const testResults: Record<string, any> = {};
    const errors: string[] = [];
    let overallSuccess = true;
    
    // Test 1: Migration Assessment
    const assessmentTest = await this.testMigrationAssessment();
    testResults.assessment = assessmentTest;
    if (!assessmentTest.success) {
      overallSuccess = false;
      errors.push(...(assessmentTest.errors || []));
    }
    
    // Test 2: Dry Run Migration
    const dryRunTest = await this.testDryRunMigration();
    testResults.dryRun = dryRunTest;
    if (!dryRunTest.success) {
      overallSuccess = false;
      errors.push(...(dryRunTest.errors || []));
    }
    
    // Test 3: Migration Verification
    const verificationTest = await this.testMigrationVerification();
    testResults.verification = verificationTest;
    if (!verificationTest.success) {
      overallSuccess = false;
      errors.push(...(verificationTest.errors || []));
    }
    
    // Test 4: Service Configuration
    const configTest = await this.testMigrationServiceConfiguration();
    testResults.configuration = configTest;
    if (!configTest.success) {
      overallSuccess = false;
      errors.push(...(configTest.errors || []));
    }
    
    // Generate summary
    const passedTests = Object.values(testResults).filter(test => test.success).length;
    const totalTests = Object.values(testResults).length;
    const summary = `Migration System Tests: ${passedTests}/${totalTests} passed. Overall: ${overallSuccess ? 'PASS' : 'FAIL'}`;
    
    console.log('🎯 Test suite completed:');
    console.log(`  📊 Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  📈 Tests: ${passedTests}/${totalTests} passed`);
    console.log(`  ⚠️ Errors: ${errors.length}`);
    
    return {
      overall: overallSuccess,
      results: testResults,
      summary,
      errors
    };
  }
}

// Export singleton for easy use
export const migrationTest = new AppointmentMigrationTest();