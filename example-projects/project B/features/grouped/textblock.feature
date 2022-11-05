Feature: Text block

	Scenario: run a successful textblock test
		Given we have behave installed
		"""
		This is
		a text block
		"""          
		When we implement a successful test
		Then we will see the result

	Scenario: run a failing textblock test
		Given we have behave installed
		"""
		This is
		a text block
		"""          
		When we implement a failing test
		Then we will see the result
 