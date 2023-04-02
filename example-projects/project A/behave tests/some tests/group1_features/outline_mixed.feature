Feature: Mixed outline

Scenario Outline: Blenders Success <thing>
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


Scenario Outline: Blenders Success paramless
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


Scenario Outline: Blenders Fail <thing>
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
Scenario Outline: Blenders Skip <thing>
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


Scenario Outline: Blenders Fail paramless
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


Scenario Outline: Blenders Success "<thing>"
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
