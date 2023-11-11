Feature: Mixed outline

	# format test comment
	# format test comment

	"""

	format test text with space before
	"""

	Scenario Outline: Blenders Success

		# format test comment

		"""
		format test text with space after

		"""

		Given I put "<thing>" in a blender
		When I switch the blender on
		then it should transform into "<other thing>"

		# format test comment

		"""
		format test text with no space
		"""

		Examples: Amphibians
			| thing         | other thing |
			| Red Tree Frog | mush        |

		Examples: Consumer Electronics
			| thing         | other thing |
			| iPhone        | toxic waste |
			| Galaxy Nexus  | toxic waste |

	Scenario Outline: Blenders Fail
		Given I put "<thing>" in a blender
		when I switch the blender on
		then it should transform into "<other thing>"

		Examples: Amphibians
			| thing         | other thing |
			| Red Tree Frog | mush        |

		Examples: Consumer Electronics
			| thing         | other thing |
			| ERROR         | FAIL        |
			| iPhone        | toxic waste |
			| Galaxy Nexus  | toxic waste |

	@skip
	Scenario Outline: Blenders Skip
		Given I put "<thing>" in a blender
		when I switch the blender on
		then it should transform into "<other thing>"

		Examples: Amphibians
			| thing         | other thing |
			| Red Tree Frog | mush        |

		Examples: Consumer Electronics
			| thing         | other thing |
			| iPhone        | toxic waste |
			| Galaxy Nexus  | toxic waste |

	Scenario Outline: Blenders Fail 2
		Given I put "<thing>" in a blender
		when I switch the blender on
		then it should transform into "<other thing>"

		Examples: Amphibians
			| thing         | other thing |
			| Red Tree Frog | mush        |

		Examples: Consumer Electronics
			| thing         | other thing |
			| ERROR         | FAIL        |
			| iPhone        | toxic waste |
			| Galaxy Nexus  | toxic waste |

	Scenario Outline: Blenders Success 2
		Given I put "<thing>" in a blender
		when I switch the blender on
		then it should transform into "<other thing>"

		Examples: Amphibians
			| thing         | other thing |
			| Red Tree Frog | mush        |

		Examples: Consumer Electronics
			| thing         | other thing |
			| iPhone        | toxic waste |
			| Galaxy Nexus  | toxic waste |
