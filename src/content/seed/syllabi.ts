// Syllabi seed: copied once from https://das.edu.pk/academics/syllabi/ on 2026-10-20 by the capture described in specs/014b-dynamic-sections/research.md (R10).
// PENDING CLIENT CONFIRMATION: it has not been confirmed that this applies to the Metroville campus.
// It is written to the database only by `npm run seed:sections` (a dry run unless --confirm), and never over existing content.
import type { SyllabiSeed } from "./types";

export const syllabiSeed: SyllabiSeed = {
  "source": "https://das.edu.pk/academics/syllabi/",
  "capturedOn": "2026-10-20",
  "adaptations": [
    "Each tab is a level, named by its tab label. Tabs and panes were paired by their order in the page's HTML (the page text itself never names the class of a pane).",
    "Each H3 heading (ENGLISH, MATHEMATICS, SCIENCE, General Information, Fee) is a subject, in the page's own capitalisation.",
    "Each H4 or H5 heading is the heading of a group; a list that follows a subject heading with no sub-heading is a group with no heading.",
    "A paragraph is the intro of its group; a paragraph that follows a list starts a new group with no heading, so no text is merged or dropped.",
    "The Play Group tab holds the page's general admission information (General Information, Fee, Admission Test), copied as it appears: it is not a syllabus.",
    "Nursery: the page's heading \"Pre-Nursery\" is put before the name of each subject that follows it (\"Pre-Nursery: ...\"), because one tab holds more than one stage.",
    "Nursery: the page's heading \"Nursery\" is put before the name of each subject that follows it (\"Nursery: ...\"), because one tab holds more than one stage.",
    "PREP · MATHEMATICS: a numbered list is seeded as bullets (the numbers are dropped).",
    "Class 3 · English: the 238-character line starting \"Noun, Verb, Adjective, Pronoun…\" is over the 200-character limit, so it is seeded as two topics, split after \"pital letters, Inverted commas\".",
    "Class 6 · MATHEMATICS: a numbered list is seeded as bullets (the numbers are dropped).",
    "Class 8 · ENGLISH: a numbered list is seeded as bullets (the numbers are dropped)."
  ],
  "levels": [
    {
      "name": "Play Group",
      "subjects": [
        {
          "name": "General Information",
          "groups": [
            {
              "topics": [
                "Parents seeking admission of their ward(s) must fill in Registration Form for each child.",
                "Registration forms are available at all schools.",
                "Registration starts in March and September every year.",
                "They must also obtain a copy of school prospectus.",
                "All students must clear the admission test to obtain admission in school.",
                "The admission test is prepared in accordance with the level of the student.",
                "Once the admission is approved by the Principal, necessary fee chalan is issued."
              ]
            },
            {
              "intro": "Admission will be confirmed on deposit of fee as well as receipt of the following:",
              "topics": []
            },
            {
              "heading": "For Fresh Admission",
              "topics": [
                "Parent’s / Guardian’s CNIC Copy",
                "Birth Certificate of the Child",
                "Two 1”x1” sized latest photographs of the student"
              ]
            },
            {
              "heading": "For Migrating Students",
              "topics": [
                "Parent’s / Guardian’s CNIC Copy",
                "Two 1”x1” sized latest photographs of the student",
                "School Leaving Certificate",
                "Last Progress Report"
              ]
            }
          ]
        },
        {
          "name": "Fee",
          "groups": [
            {
              "intro": "Once the admission is confirmed by the Principal, a non-refundable admission fee will be charged for each student. Monthly Tuition fee will be charged according to area, class level and other relevant factors. Fee may be varied from branch to branch due to the services provided by the concerned branch. Parents should contact concerned branch for exact fees structure. If the dues are not paid by the due date, name of the student will be struck off from the school rolls and readmission will be administered. The school will formally intimate the parents that their ward’s name has been struck off from the school rolls on non-payment of dues by the due date.",
              "topics": []
            },
            {
              "heading": "Admission Test",
              "intro": "All students must clear the admission test to obtain admission in school. The admission test is prepared in accordance with the level of the student.",
              "topics": []
            }
          ]
        }
      ]
    },
    {
      "name": "Nursery",
      "subjects": [
        {
          "name": "Pre-Nursery: ENGLISH",
          "groups": [
            {
              "topics": [
                "Recognition of capital letters A – Z",
                "Oral A – Z",
                "Writing A – Z",
                "Phonics A – Z",
                "Picture recognition A – Z",
                "Look and match A – J"
              ]
            }
          ]
        },
        {
          "name": "Pre-Nursery: MATHEMATICS",
          "groups": [
            {
              "topics": [
                "Recognition of numbers 0 – 10",
                "Writing 0 – 50",
                "Count and write 0 – 10"
              ]
            },
            {
              "heading": "Shapes",
              "topics": [
                "Circle, square, triangle, rectangle",
                "Recognition",
                "Oral",
                "Writing",
                "Look and match"
              ]
            }
          ]
        },
        {
          "name": "Nursery: ENGLISH",
          "groups": [
            {
              "topics": [
                "Capital alphabets A – Z",
                "Small alphabets a – z",
                "Oral A – Z",
                "Phonics A – Z",
                "Picture recognition A – Z",
                "Dictation of letter A a – Z z",
                "Match the letters with picture A a – Z z",
                "Write the first letter A a – Z z"
              ]
            }
          ]
        },
        {
          "name": "Nursery: MATHEMATICS",
          "groups": [
            {
              "topics": [
                "Oral counting 0 – 50",
                "Written 0 – 50",
                "Missing numbers 0 – 50",
                "Dictation 0 – 50"
              ]
            },
            {
              "heading": "Shapes",
              "topics": [
                "Triangle, circle, rectangle, star, heart, oval, half circle, diamond, square"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "PREP",
      "subjects": [
        {
          "name": "ENGLISH",
          "groups": [
            {
              "topics": [
                "Capital and small alphabets A a – Z z",
                "Cursive writing small a – z",
                "Dictation words (Three letters e.g. box, bag)",
                "Phonics a – z",
                "say of “a” and “an”",
                "Complete the sentences",
                "Reading + phonics of three letters words (E.g. dog, bun, etc.)"
              ]
            }
          ]
        },
        {
          "name": "MATHEMATICS",
          "groups": [
            {
              "topics": [
                "Oral counting 0 – 100.",
                "Writing 0 – 100",
                "Missing number 0 – 100",
                "What comes after, between and before 0 – 100",
                "Backward counting 100 – 0",
                "Concept of Addition 0 – 10",
                "Recognition of shapes (circle, heart, triangle, rectangle, oblong, oval, diamond, star, square, cube, cylinder, crescent, cuboids)",
                "Count and write how many"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Class 1",
      "subjects": [
        {
          "name": "ENGLISH",
          "groups": [
            {
              "topics": [
                "Word building (at least 3 words with each letter) a – z",
                "Make simple/meaningful sentences",
                "Cursive writing A a – Z z",
                "Picture comprehension/comprehension",
                "Guided writing e.g. My cat, My chair, Myself",
                "My school, My classroom (at least 10 lines)",
                "Pick up Noun, Verb, Adjective",
                "Vowels and rhyming words",
                "Singular Plural, Masculine Feminine, Words Opposites",
                "Days of the week, Months of the year, birds,",
                "animals, seasons, vegetables, fruits name",
                "Dictation words (6,7 letters word e.g. horse, table etc)",
                "Reading of simple paragraph or sentences"
              ]
            }
          ]
        },
        {
          "name": "MATHEMATICS",
          "groups": [
            {
              "topics": [
                "2 – 5 times tables",
                "2 – 3 times dodging tables",
                "Counting in words one – twenty"
              ]
            },
            {
              "heading": "Shapes",
              "topics": [
                "Circle, half circle, star, cube, cuboid, rectangle, triangle, sphere, cylinder, oval, oblong, crescent"
              ]
            },
            {
              "heading": "Counting 1 –– 200",
              "topics": [
                "Beginning addition: Addition with number 1 – 100",
                "Beginning subtraction: Subtraction with number 1 – 10",
                "Adding and Subtracting with 0",
                "Adding with the number line: vertical notation.",
                "Subtracting with the number line: vertical notation",
                "Making 10",
                "Subtracting from 10"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Class 2",
      "subjects": [
        {
          "name": "MATHEMATICS",
          "groups": [
            {
              "topics": [
                "2 – times tables",
                "Comparisons",
                "Shapes & their name",
                "Addition & subtraction with “0” zero.",
                "Concept of greater “>” & lesser “<“",
                "Word problem (Numbers to 20) Addition & Subtraction",
                "Number play: Adding 3 numbers",
                "Numbers to 90: Counting in tens",
                "Place value: Numbers 20 – 99",
                "Counting in words: One to hundred",
                "Addition: Adding T U to T U (No changing)",
                "Using multiples of 2,3,4,5,10",
                "Division: Equal shares, repeated, subtraction equal group, using the number",
                "Money: Introducing coins and paper money",
                "simple sums with coins and paper money"
              ]
            }
          ]
        },
        {
          "name": "ENGLISH",
          "groups": [
            {
              "topics": [
                "Definition & examples of noun, verb, adjective, pronoun & preposition",
                "3 – forms of verb",
                "Punctuation",
                "Genders / Numbers",
                "Opposites",
                "Creative writing",
                "Use of do/does/has/have/was/were/did",
                "Jumble up words",
                "Guided writing",
                "Letter writing",
                "Comprehension",
                "Dictations words",
                "Reading of passage, stories etc"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Class 3",
      "subjects": [
        {
          "name": "Mathematics",
          "groups": [
            {
              "heading": "Whole Numbers",
              "topics": [
                "Writing number name up to 100",
                "Recognition of numerals up to 500",
                "Place value: units & tens up to 400 by using concrete material & pictures.",
                "Adding T U to T U + H T U to H T U + word problem",
                "Subtraction T U from T U + H T U from H T U + word problem",
                "Add & Subtract by m & cm , Kg & g , l & ml",
                "Multiplication facts with changing units & tens, & commutative property.",
                "Linking the concepts multiplication & division facts.",
                "Long division, word problem."
              ]
            },
            {
              "heading": "Shapes",
              "topics": [
                "Edge, vertex, cube, cylinder, cone, plane & curved faces."
              ]
            },
            {
              "heading": "Fractions",
              "topics": [
                "Introduction of half & quarter & symbol ½ and ¼.",
                "Fractions associated with given shapes.",
                "Coloring the portions of the shapes showing fractions."
              ]
            },
            {
              "heading": "Time",
              "topics": [
                "Reading & telling time ___x___ O’ clock",
                "Names of the days of the week: 1 week = 7 days",
                "Names of months (Solar Calendar)"
              ]
            },
            {
              "heading": "Money",
              "topics": [
                "Introduction of currency notes ––––",
                "Rs. 10 Rs. 20 Rs. 50 Rs. 100",
                "Rs. 500 Rs. 1000 & coins Rs. 1 & Rs. 2"
              ]
            },
            {
              "heading": "Shopping",
              "topics": [
                "To buy & sell by the right selection of money"
              ]
            }
          ]
        },
        {
          "name": "English",
          "groups": [
            {
              "heading": "Reading",
              "topics": [
                "Oxford Modern English 2",
                "Short fairy tales"
              ]
            },
            {
              "heading": "Writing",
              "topics": [
                "Basic vocabulary & correct spellings",
                "Writing meaningful sentences with given words.",
                "Writing a short description on a given topic."
              ]
            },
            {
              "heading": "Comprehension",
              "topics": [
                "To interpret a picture or description",
                "Fill in spaces with suitable words.",
                "Giving answers after analyzing and writing.",
                "To judge if a statement is true or false."
              ]
            },
            {
              "heading": "Grammar",
              "topics": [
                "Noun, Verb, Adjective, Pronoun, Apostrophe, Preposition, Possessive Pronoun, Punctuation adding full stop, Comma, Question mark, Capital letters, Inverted commas",
                "Present & past simple and continuous (affirmative, negative, interrogative)"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Class 4",
      "subjects": [
        {
          "name": "MATHEMATICS",
          "groups": [
            {
              "heading": "Whole Numbers",
              "topics": [
                "Reading and writing numbers up to 400.",
                "Writing number names up to 400.",
                "Completing number sequences.",
                "Assigning number (before –between – after)",
                "Greater and less than (use of symbols > , <)",
                "Place value up to 999"
              ]
            },
            {
              "heading": "Addition",
              "topics": [
                "4 – digit numbers.",
                "Adding more than two numbers (without & with exchange by using concrete & pictures)",
                "Horizontal & vertical addition",
                "Word problems"
              ]
            },
            {
              "heading": "Subtraction",
              "topics": [
                "4 – digit number",
                "Changing with zero in the U, T and H.",
                "Horizontal and vertical subtraction",
                "Word problems (without & with exchange by using concrete & pictures)"
              ]
            },
            {
              "heading": "Multiplication",
              "topics": [
                "T U and H T U multiplied by U",
                "Multiplying three numbers",
                "Multiplying by 10",
                "Vertical form multiplying by 100",
                "Word problems (by using concrete, pictures & tables)"
              ]
            },
            {
              "heading": "Shopping",
              "topics": [
                "The four operations (Addition, Subtraction , Multiplication , Division )",
                "Making bills"
              ]
            },
            {
              "heading": "Fractions",
              "topics": [
                "Proper fractions with denominators up to 1/10 by showing coloured parts of pictures",
                "Recognition of terms such as halves, thirds, quarters (fourth) ——-."
              ]
            },
            {
              "heading": "Shapes",
              "topics": [
                "Concept of points, lines & line segments",
                "Introduction of parallel lines.",
                "Knowledge about plane shapes",
                "Shapes (their properties and perimeter)"
              ]
            },
            {
              "heading": "Time",
              "topics": [
                "Telling and reading the proper time",
                "1-day = 24-hours, 1-week = 7-days, 1-year = 12 months"
              ]
            }
          ]
        },
        {
          "name": "ENGLISH",
          "groups": [
            {
              "heading": "Reading",
              "topics": [
                "Oxford Modern Eng-3",
                "Reading of simple fairy tales"
              ]
            },
            {
              "heading": "Writing",
              "topics": [
                "Basic vocabulary, story spelling, Dictation",
                "Writing meaningful sentences of given phrases",
                "Writing a description on a given topic",
                "Letter writing, Application writing"
              ]
            },
            {
              "heading": "Comprehension",
              "topics": [
                "To understand and analyse a passage",
                "Given answers about it",
                "Judging if a statement is true or false.",
                "To analyse a picture and solving of given work sheet."
              ]
            },
            {
              "heading": "Grammar",
              "topics": [
                "Parts of speech, punctuation:",
                "Full stop, commas, question marks, capital letters, inverted commas, singular & plural, word/opposite, synonyms",
                "Jumbled word/sentences, syllables"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Class 5",
      "subjects": [
        {
          "name": "MATHEMATICS",
          "groups": [
            {
              "heading": "Decimal Numeration System",
              "topics": [
                "Place value up to 9999",
                "How to write a number in words and numerals up to 9999",
                "Completing sequence of numbers",
                "Addition",
                "Subtraction up to 9999",
                "Word problems of addition & subtraction",
                "Multiplication Table 2 – 12",
                "Division with bigger numbers"
              ]
            },
            {
              "heading": "Fraction",
              "topics": [
                "Concept of the terms numerator, denominator, like & unlike fractions, proper & improper & mixed fractions",
                "Concept of equivalent fractions."
              ]
            },
            {
              "heading": "Measurement",
              "topics": [
                "Concept of length and weight and their conversions from m to cm & kg to g."
              ]
            },
            {
              "heading": "Geometry",
              "topics": [
                "Introduction of solid and hollow shapes, sphere, cylinder, cone, cube & cuboid, Flat & non flat surface.",
                "Introduction of rays and lines",
                "Measurement of segments",
                "Introduction of the concept of perimeter"
              ]
            },
            {
              "heading": "Time",
              "topics": [
                "Concept of a.m. & p.m.",
                "Leap year, Months & hours",
                "Word problems"
              ]
            }
          ]
        },
        {
          "name": "ENGLISH",
          "groups": [
            {
              "heading": "Reading",
              "topics": [
                "Oxford Modern Eng. 4",
                "Story books"
              ]
            },
            {
              "heading": "Writing",
              "topics": [
                "Basic vocabulary, Dictation, writing meaningful sentence with given idioms and phrases",
                "Letter writing, Application writing, Invitation writing",
                "Writing a simple story on given topic (imagination, description, writing)"
              ]
            },
            {
              "heading": "Comprehension Skills",
              "topics": [
                "Interpretation of a picture or description, analyzing and reasoning about meaning of tent, perception skills.",
                "Picture composition",
                "Complete the story with a suitable title"
              ]
            },
            {
              "heading": "Grammar",
              "topics": [
                "Parts of speech, Articles, Singular plural, Compound words, Prefixes, Suffixes, Antonyms, Synonyms, Simile, Transitive & Intransitive verb, Direct and indirect",
                "Present, past & Future simple & continuous (affirmative, negative & interrogative)"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Class 6",
      "subjects": [
        {
          "name": "MATHEMATICS",
          "groups": [
            {
              "heading": "Decimal Numeration System",
              "topics": [
                "Writing and reading numbers in words and figures from 5 digits to 8 digits",
                "To find place value of digits in the numeral representation of a number up to 8 digits.",
                "Comparing and placing in order, (whole number) i.e. ascending and descending order up to millions",
                "Expanded form and standard form of writing natural numbers",
                "Interpretation of 6 and 7 digit numbers"
              ]
            },
            {
              "heading": "Subtraction",
              "topics": [
                "Addition of whole numbers",
                "Subtraction of whole numbers",
                "Multiplication of whole number. In multiplication, the multiplier will be a 2 digit number and multiplicand a 5 digit number.",
                "Distributive property of multiplication over addition & subtraction.",
                "Associative properties of addition and multiplication.",
                "Division, when the divisor is a 2 digit number. Dividend up to 999999",
                "Mixed operations on whole numbers with the use of brackets (one bracket and 2 operations)"
              ]
            },
            {
              "heading": "Rounding off (Introduction)",
              "topics": [
                "Rounding off a whole number to the nearest 10",
                "To the nearest 100",
                "To the nearest 1000"
              ]
            },
            {
              "heading": "Shapes and Measures",
              "topics": [
                "Concept and basic knowledge of a point a line, a segment, a ray",
                "Concept and definition of angle",
                "Measurement of angles",
                "Classification of angles (acute, obtuse, right, straight, reflex)",
                "Sum of measures of the angles of a triangle. To find measure of an unknown angle of a triangle",
                "Scalene, Isosceles, Equilateral",
                "Acute Angled Triangle, Right Angled Triangle and Obtuse Angled Triangle",
                "Fractions (Common and Decimal)",
                "Reduction of common fractions to the simplest form",
                "Further work on equivalent fractions",
                "Comparison of common fractions",
                "Addition and subtraction of:",
                "Like common fractions (harder problems)",
                "Unlike common fractions",
                "Multiplication of fractions (All cases)",
                "Division of fractions (All cases)",
                "Introduction of decimal fractions",
                "Reading numbers involving decimal points",
                "Place values of digits on the right of the decimal point up to 100ths",
                "Comparison of decimal fractions",
                "Addition, subtraction, multiplication & division of decimal fractions"
              ]
            },
            {
              "heading": "Area and perimeter",
              "topics": [
                "Perimeter of triangular and quadrilateral regions",
                "Introduction of the term area",
                "Finding areas of rectangular and square regions with standard unit (cm2)",
                "Word problems on area/perimeter"
              ]
            },
            {
              "heading": "Volume and Capacity",
              "topics": [
                "Introduction of the concept of volume",
                "Finding the volume of cubes and cuboids by using concrete material.",
                "Introduction of m3, cm3, mm3",
                "Concept of capacity and finding capacities of containers by using standard units.",
                "Introduction of the terms litres and millilitres.",
                "Word problems on volume and capacity."
              ]
            }
          ]
        },
        {
          "name": "ENGLISH",
          "groups": [
            {
              "topics": [
                "Reading Oxford Modern Eng 5, Short stories, novel"
              ]
            },
            {
              "heading": "Writing Skills",
              "topics": [
                "Write story/letter report a visit or experience; summarise a text; composition/story writing (narrative, descriptive, imaginative)"
              ]
            },
            {
              "heading": "Comprehension",
              "topics": [
                "Analysing and reasoning about meaning of text, perception skills"
              ]
            },
            {
              "heading": "Grammar",
              "topics": [
                "Parts of speech",
                "Kinds of noun",
                "Subject",
                "Predicate",
                "Contraction",
                "Antonyms",
                "Synonyms",
                "Homonyms",
                "Degrees of adjectives",
                "Changing present tense to past tens",
                "Direct & indirect",
                "Active voice and passive voice"
              ]
            }
          ]
        },
        {
          "name": "SCIENCE",
          "groups": [
            {
              "heading": "Ourselves",
              "topics": [
                "The brain",
                "Teeth",
                "Digestion",
                "Food"
              ]
            },
            {
              "heading": "Living things",
              "topics": [
                "Life cycle"
              ]
            },
            {
              "heading": "Material & matter",
              "topics": [
                "Elements",
                "Water"
              ]
            },
            {
              "heading": "Sky & Space",
              "topics": [
                "Space travel"
              ]
            },
            {
              "heading": "The earth & atmosphere",
              "topics": [
                "Pollutions"
              ]
            },
            {
              "heading": "Electricity & magnetism",
              "topics": [
                "Electricity"
              ]
            },
            {
              "heading": "Machines, Force & Energy",
              "topics": [
                "Force"
              ]
            },
            {
              "heading": "Sound and musical / height & colour",
              "topics": [
                "Sounds"
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Class 7",
      "subjects": [
        {
          "name": "MATHEMATICS",
          "groups": [
            {
              "heading": "Whole Number System",
              "topics": [
                "Review of Natural Numbers, Whole Numbers, Even Numbers and Odd Numbers",
                "Properties of Numbers (Commutative, Associative and Distributive)",
                "Writing Whole Numbers in words and figures (Up to 10 billions)",
                "Reading Whole Numbers (Up to 10 billions)",
                "Prime Numbers and Composite Numbers",
                "Multiplication: One of the Numbers in a 3-digit number and the other 5-digit number",
                "Division: One of the numbers in a 3-digit and the other a 6-digit number",
                "Emphasis on Word Problems which should be selected from various sources"
              ]
            },
            {
              "heading": "Rational Numbers (Common and Decimal Fractions)",
              "topics": [
                "Addition of 3 common fractions (to be done after L.C.M)",
                "Review, revision and up-gradation of work done up to Class 6",
                "Conversion of Common Fractions to Decimal Fractions and Vice Versa",
                "Place values on the right of the decimal point up to thousandths",
                "Expanded and standard forms of a Rational Number up to thousandths",
                "Multiplication and Division of Decimal Fractions",
                "Comparison of Rational Numbers",
                "Sets of Natural Numbers, Whole Numbers and Positive Rational Numbers concept of predecessor and successor.",
                "Rounding off Decimal Fractions (up to three decimal places)",
                "Use of brackets involving Natural Numbers, Common Fractions and Decimal Fractions (two brackets in a problem)",
                "Word problems",
                "Commutative, Associative and Distributive properties involving rational number with respect to addition and multiplication",
                "Algebra, Addition and Subtraction of Algebraic expressions, Word problems involving equations"
              ]
            },
            {
              "heading": "Mixed operations",
              "topics": [
                "Use of brackets (2 brackets at a time)"
              ]
            },
            {
              "heading": "G.C.D and L.C.M.",
              "topics": [
                "Short division: Dividend up to 99 and 2,3,5,7 as divisors",
                "Divisibility and methods to find Factors and Prime Factors",
                "Factorization and Prime Factorization",
                "To find G.C.D of two numbers y common factors method and prime factorization method",
                "Multiples and link between a factor and a multiple",
                "To find L.C.M of two numbers by common multiples method and prime factorization method",
                "All numbers up to 99"
              ]
            }
          ]
        },
        {
          "name": "ENGLISH",
          "groups": [
            {
              "intro": "Essay writing/Short story (about 250 words)\n\nComprehension Unseen\n\nStory writing/Creative writing (About 125 words)",
              "topics": []
            },
            {
              "heading": "Grammar",
              "topics": [
                "Parts of speech",
                "Kinds of noun",
                "Subject",
                "Predicate",
                "Contraction",
                "Antonyms",
                "Synonyms",
                "Homonyms",
                "Degrees of adjectives",
                "Changing present tense to past tens",
                "Direct & indirect",
                "Active voice and passive voice",
                "Tenses (complete)"
              ]
            }
          ]
        },
        {
          "name": "SCIENCE",
          "groups": [
            {
              "heading": "What is Science?",
              "intro": "The Scientific Method, Safety Rules in the Laboratory, Laboratory Apparatus",
              "topics": []
            },
            {
              "heading": "Measuring Length, Area & Volume",
              "intro": "Physical quantities and SI units measuring length, instrument for measuring length. Measuring area. Measuring volume, meniscus reading, instruments for measuring the volume of liquids.",
              "topics": []
            },
            {
              "heading": "Time Rate and Speed",
              "intro": "The stop clock and stop watches. Rate of petrol consumption. Rate of volume flow. Using rate to make comparison. Speed units for speed. The speed equation.",
              "topics": []
            },
            {
              "heading": "What is Mass?",
              "intro": "Measuring Mass density. Finding the density of a substance. The density equation. Floating and sinking. Temperature. Thermometer.",
              "topics": []
            },
            {
              "heading": "Matter and their physical properties",
              "intro": "Matter, Physical properties of matter, Comparing physical properties of materials. Everyday use of material.",
              "topics": []
            },
            {
              "heading": "What causes change?",
              "intro": "Changes caused by heat. Changes caused by light. Changes by mixing. Changes caused by electricity. Chemical reactions",
              "topics": []
            },
            {
              "heading": "What is an element?",
              "intro": "Classifying elements – The periodic table. Group and period. Metals and non-metals. Use of metals and non-metals. Properties and difference between metals and non metals. Alloys",
              "topics": []
            },
            {
              "heading": "Classifying Plants and Animals",
              "intro": "Classification of living things. The animal kingdom. Vertebrates and invertebrates. The plant kingdom. Using keys in classification. Wildlife alert.",
              "topics": []
            }
          ]
        }
      ]
    },
    {
      "name": "Class 8",
      "subjects": [
        {
          "name": "MATHEMATICS",
          "groups": [
            {
              "topics": [
                "Whole Numbers"
              ]
            }
          ]
        },
        {
          "name": "ENGLISH",
          "groups": [
            {
              "topics": [
                "Essay writing/Short story (about 350 words)",
                "Comprehension Unseen",
                "Account writing (About 175 words)",
                "Outline Given",
                "Series of Pictures",
                "Grammar"
              ]
            }
          ]
        },
        {
          "name": "SCIENCE",
          "groups": [
            {
              "heading": "Compounds or Mixtures",
              "intro": "What is a compound? Some common properties of compounds. How are compounds formed?\n\nMixtures, Some useful mixtures, some common properties of mixtures",
              "topics": []
            },
            {
              "heading": "Separating Mixtures",
              "intro": "Methods of separating mixtures filtration. Evaporation. Crystallization. Distillation. Fractional distillation. Chromatography.",
              "topics": []
            },
            {
              "heading": "Air",
              "intro": "Composition of air. Why is air a mixture? Identification. Test of Oxygen and Carbon dioxide. Properties of the gases in the air.",
              "topics": []
            },
            {
              "heading": "Air Pollution",
              "intro": "What pollutes the air. Air pollutants. Sulphur dioxide, Carbon monoxide, Oxides of Nitrogen. Lead compounds. CFCs. Cleaning up the Air. Effects of human activities on the environment. The greenhouse effect and global warming. Thinning of Ozone Layer. Acid Rain",
              "topics": []
            },
            {
              "heading": "Food – Our source of Energy",
              "intro": "Food – our source of energy. The main classes of food. Energy value of food. Balancing our diet.",
              "topics": []
            },
            {
              "heading": "Force and Pressure",
              "intro": "What is force? Effects of force. Friction. Uses of friction. Negative effects of friction magnetic force. Gravitation force. Unit of force. Measuring forces. Pressure",
              "topics": []
            },
            {
              "heading": "Work",
              "intro": "Work. Just a change of energy? Doing work. Word done by a force. Joule (J) – The unit for work and energy. Work and changes in energy.",
              "topics": []
            },
            {
              "heading": "Turning effect of forces",
              "intro": "Effect of forces. The moment of force. Simple machines. Lever – a simple machine. Classes of lever.",
              "topics": []
            },
            {
              "heading": "Water pollution",
              "intro": "What pollutes our water? Factory waste. Fertilizers. Pesticides. Farm waste. Animal waste. Oil litter. Untreated sewage. Raw sewage. Controlling water pollution.",
              "topics": []
            },
            {
              "heading": "Effects of heat energy",
              "intro": "Thermal expansion and contraction. Thermal expansion and contraction of solids. Metal ball and gauge experiment. Metal ball and ring experiment. Thermal expansion and contraction of liquids and gases. Effects of expansion and contraction in everyday life. Applications of expansion and contraction. Liquid in glass thermometer. Ice and steam point. Measuring temperature.",
              "topics": []
            }
          ]
        }
      ]
    }
  ]
};
