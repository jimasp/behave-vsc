Feature: Containing /[.*+?^${}()|[\]\ regex chars

	Scenario: run a successful rx scenario = /[.*+?^${}()|[\]\
		Given we have (behave) installed
		When "we" implement a [successful] test
		Then we will *see* the result

	Scenario: run a failing rx scenario = /[.*+?^${}()|[\]\
		Given we have (behave) installed
		When "we" implement a [failing] test
		Then we will *see* the result
