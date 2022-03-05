// You can import and use all API from the 'vscode' module
// as well as import your extension to test it

import { runAllTestsAndAssertTheResults} from '../extension.test.helpers';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { getExpectedResults } from './expectedResults';


suite('Example-project-workspace-2 Test Suite', () => {	

	test('runHandler should return expected results with config { runParallel:false, runAllAsOne:true, fastSkip: "@fast-skip-me, @fast-skip-me-too" }', 
		async() => {
			const testConfig = new TestWorkspaceConfig(false, true, "@fast-skip-me, @fast-skip-me-too" );
			await runAllTestsAndAssertTheResults(false, testConfig, getExpectedResults);
		}
	).timeout(120000);	

	test('runHandler should return expected results with config { runParallel:false, runAllAsOne:false, fastSkip: "@fast-skip-me, @fast-skip-me-too" }', 
		async() => {		
			const testConfig = new TestWorkspaceConfig(false, false, "@fast-skip-me, @fast-skip-me-too" );
			await runAllTestsAndAssertTheResults(false, testConfig, getExpectedResults);
		}
	).timeout(120000);		

	test('runHandler should return expected results with config { runParallel:true, runAllAsOne:false, fastSkip: "@fast-skip-me, @fast-skip-me-too" }', 
		async() => {
			const testConfig = new TestWorkspaceConfig(true, false, "@fast-skip-me, @fast-skip-me-too" );
			await runAllTestsAndAssertTheResults(false, testConfig, getExpectedResults);
		}
	).timeout(120000);	
	
	test('runHandler (debug) should return expected results with config { fastSkip: "@fast-skip-me, @fast-skip-me-too" }', 
		async() => {		
			// NOTE - if this fails, try removing all breakpoints in both environments
			const testConfig = new TestWorkspaceConfig(false, false, "@fast-skip-me, @fast-skip-me-too" );
			await runAllTestsAndAssertTheResults(true, testConfig, getExpectedResults);
		}
	).timeout(240000);		

}).timeout(600000);






