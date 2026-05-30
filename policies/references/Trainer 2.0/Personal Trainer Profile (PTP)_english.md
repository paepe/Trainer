# Personal Trainer Profile (PTP)

## AI Coach Creation — Organized Trainer Profile Structure

This form is designed to capture the Personal Trainer’s technical identity, behavioral style, and training methodology so the AI can generate workouts aligned with the coach’s real approach instead of producing generic recommendations.  
---

# 1\. Personal Information

## 1.1 Basic Information

| Field | Input Type | Notes |
| :---- | :---- | :---- |
| Profile Photo | Image upload | Professional photo or avatar |
| Full Name | Text | Trainer’s full name |
| Gender | Selection | Male, female, other / prefer not to say |
| Age | Number | Optional |

---

# 2\. Professional Background

## 2.1 Coaching Experience

| Field | Input Type | Notes |
| :---- | :---- | :---- |
| Years of Coaching Experience | Number | Total years of professional experience |

---

## 2.2 Certifications / Education

Input type: multiple selection.  
Options:

* Personal Trainer  
* Fitness Coach  
* Sports Science Degree  
* Physiotherapist  
* Strength & Conditioning Coach  
* Other

---

# 3\. Personal Fitness Level

## 3.1 Current Fitness Level

Input type: single selection.

| Level | Description |
| :---- | :---- |
| 1 | Elite Athlete |
| 2 | Very Fit |
| 3 | Fit |
| 4 | Average |
| 5 | Moderately Active |

---

# 4\. Training Preferences

## 4.1 Preferred Training Methods

Input type: multiple selection.  
Options:

* CrossFit  
* Functional Fitness  
* HIIT  
* Circuit Training  
* Bodybuilding  
* Strength Training  
* Running  
* Mobility Training  
* Athletic Performance Training  
* Calisthenics  
* Machine-Based Training  
* Other

---

## 4.2 Preferred Training Environments

Input type: multiple selection.  
Options:

* CrossFit Box  
* Commercial Gym  
* Calisthenics Park  
* Outdoor — No Equipment  
* Outdoor — Resistance Bands  
* Indoor — No Equipment  
* Indoor — Resistance Bands

---

## 4.3 General Workout Intensity

Input type: single selection.  
Options:

* Moderate  
* Challenging  
* Variable  
* Highly Demanding

---

# 5\. Coach DNA

## Defining the Coach’s Unique Style

This section defines the trainer’s technical and behavioral identity. It is one of the most important parts of the profile because it guides the AI in creating workouts with a distinct coaching personality.  
---

## 5.1 Coaching Style

Input type: multiple selection.  
Options:

* Motivational  
* Professional  
* Technical  
* Performance-Oriented  
* Relaxed / Humorous  
* Empathetic  
* Direct  
* Disciplined

---

## 5.2 Core Training Principles

Input type: select up to 3 options.  
Options:

* Quality Before Intensity  
* Intensity Before Perfection  
* Health First  
* Strength First  
* Athleticism First  
* Mobility First  
* Enjoyment & Motivation First  
* Function Over Aesthetics  
* Sustainable Progress

---

# 6\. Training Focus Distribution

## 6.1 Focus Allocation

Input type: percentage distribution.  
Rule: the total must equal 100%.

| Focus Area | Percentage |
| :---- | :---- |
| Strength | \_\_\_ % |
| Endurance | \_\_\_ % |
| Mobility | \_\_\_ % |
| Athletic Performance | \_\_\_ % |
| Coordination | \_\_\_ % |
| Stability / Balance | \_\_\_ % |
| Total | 100% |

---

# 7\. Exercise Preferences

## 7.1 Favorite Exercises

Input type: selection or free text.  
Limit: up to 10 exercises.  
Examples:

* Burpees  
* Kettlebell Swings  
* Air Squats  
* Farmer Carries  
* Wall Balls  
* Lunges  
* Turkish Get-Ups  
* Pull-Ups  
* Sprints

---

## 7.2 Exercises to Avoid

Input type: free text.  
Examples:

* No Box Jumps  
* No Heavy Deadlifts  
* No Sit-Ups  
* No Running

---

# 8\. Workout Design Preferences

## 8.1 Preferred Workout Formats

Input type: multiple selection.  
Options:

* EMOM  
* AMRAP  
* For Time  
* Interval Training  
* Circuit Training  
* Supersets  
* Strength \+ MetCon  
* Strength Only  
* Conditioning Only  
* Tabata

---

## 8.2 Preferred Workout Structure

Input type: drag-and-drop or ordered ranking.  
The trainer should arrange the blocks in the sequence they typically use when designing a workout session.  
Example blocks:

* Mobility  
* Warm-Up  
* Technique  
* Strength  
* Conditioning / Workout  
* Cooldown

---

## 8.3 Preferred Intensity Curve

Input type: single selection.  
Options:

* Progressive Build-Up  
* Wave-Based  
* Early Peak  
* Late Peak  
* Consistent Throughout

---

# 9\. Communication Style

## 9.1 Preferred Communication Tone

Input type: single selection or multiple selection.  
Options:

* Professional  
* Motivational  
* Relaxed  
* Athletic  
* Direct  
* Technical

---

# 10\. Primary Client Focus

## 10.1 Target Client Profiles

Input type: multiple selection.  
Options:

* Beginners  
* Intermediate Clients  
* Advanced Athletes  
* Women  
* Men  
* Seniors  
* Office Workers  
* Weight Loss Clients  
* Muscle Gain Clients  
* Rehabilitation Clients  
* Functional Fitness Enthusiasts  
* CrossFit Athletes

---

# 11\. Coach Philosophy

## 11.1 Coach Motto / Philosophy

Input type: free text.  
Examples:  
“Move better before you move harder.”  
“Strength for everyday life.”  
“Fitness without excuses.”  
“Quality over quantity.”  
---

# 12\. Optional AI Personality Prompt

## 12.1 AI Coaching Experience Description

Input type: free text.  
Instruction: describe, in one or two sentences, how clients should experience this coach’s training style.

### Example

“My coaching combines functional strength, athletic conditioning, and sustainable progress. I want clients to feel challenged, capable, and successful after every session.”  
---

# 13\. Why the AI Personality Prompt Matters

This field is especially valuable because it helps the AI generate workouts that remain consistent with the trainer’s identity.  
Instead of creating generic plans, the system considers:

* communication style;  
* training philosophy;  
* favorite exercises;  
* exercises to avoid;  
* preferred intensity;  
* typical session structure;  
* target client profile;  
* the coach’s main methodology.

In practice, this field helps the AI produce workouts that feel as if they were designed by the trainer, not by a generic training algorithm.  
---

# 14\. Recommended Technical Object Structure

{  
  "personalTrainerProfile": {  
    "personalInformation": {  
      "profilePhoto": "",  
      "fullName": "",  
      "gender": "",  
      "age": null  
    },  
    "professionalBackground": {  
      "yearsOfExperience": null,  
      "certificationsEducation": \[\]  
    },  
    "personalFitnessLevel": null,  
    "trainingPreferences": {  
      "preferredTrainingMethods": \[\],  
      "preferredTrainingEnvironments": \[\],  
      "generalWorkoutIntensity": ""  
    },  
    "coachDNA": {  
      "coachingStyle": \[\],  
      "coreTrainingPrinciples": \[\],  
      "trainingFocusDistribution": {  
        "strength": 0,  
        "endurance": 0,  
        "mobility": 0,  
        "athleticPerformance": 0,  
        "coordination": 0,  
        "stabilityBalance": 0  
      }  
    },  
    "exercisePreferences": {  
      "favoriteExercises": \[\],  
      "exercisesToAvoid": ""  
    },  
    "workoutDesignPreferences": {  
      "preferredWorkoutFormats": \[\],  
      "preferredWorkoutStructure": \[\],  
      "preferredIntensityCurve": ""  
    },  
    "communicationStyle": \[\],  
    "primaryClientFocus": \[\],  
    "coachPhilosophy": {  
      "motto": "",  
      "aiPersonalityPrompt": ""  
    }  
  }  
}

---

# 15\. Recommended Module Name

## AI Coach Profile Builder

Alternative options:

1. Coach DNA Setup  
2. Trainer Intelligence Profile  
3. Personal Trainer AI Configuration  
4. Coach Methodology Profile  
5. AI Training Style Setup