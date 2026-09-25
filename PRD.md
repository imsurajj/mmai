# MemoryTrack AI — Prioritized MVP Project Flow

## 1. MVP Purpose

Build a secure web/mobile application that helps people with memory impairment remember verified information while enabling authorized caregivers to monitor routines, reminders, and changes from the patient's personal baseline.

> **Important:** The MVP must not diagnose Alzheimer's, dementia, or any medical condition. It should present results as observations, reminders, or alerts only.

The MVP will focus on:

- Patient and caregiver accounts
- Caregiver-created patient profiles
- Verified memory timeline
- Daily memory checks
- Personal baseline tracking
- Memory assistant for verified information
- Medication and appointment reminders
- Caregiver dashboard
- Repeated-change alerts
- Role-based access and privacy controls

---

## 2. MVP Priority Levels

### P0 — Essential MVP Features

_Required for the first usable release_

1. Authentication and role-based access
2. Caregiver-created patient profile
3. Patient-caregiver linking
4. Verified memory timeline
5. Daily memory check
6. Personal baseline calculation
7. Baseline comparison and repeated-change detection
8. Memory assistant using verified data only
9. Reminders and missed-reminder alerts
10. Caregiver dashboard
11. Secure data access and audit-friendly permissions

### P1 — Important but Can Follow the First Demo

1. Voice input and text-to-speech
2. Patient help button
3. Safe-zone monitoring
4. Weekly caregiver summary
5. Family member profiles with photos
6. Realtime dashboard updates
7. Push notifications
8. Patient file upload and private file library (see `PATIENT-FILE-UPLOAD-PRD.md`)

### P2 — Deferred Features

1. Face recognition
2. Object recognition
3. GPS wandering detection
4. Doctor or therapist portal
5. Emergency-services integration
6. Advanced AI-generated reports
7. Clinical validation
8. Medication verification through camera
9. Fully native mobile applications
10. Predictive risk scoring

---

## 3. MVP Users

### Patient

The patient can:

- Sign in
- View verified memories
- Complete daily memory checks
- Ask questions about stored information
- View and confirm reminders
- Request caregiver help

### Caregiver

The caregiver can:

- Create and manage a patient profile
- Link to a patient
- Add verified memories
- Create reminders
- View test results and trends
- Receive alerts
- Review patient activity

---

## 4. MVP User Flow

```
Caregiver creates account
        ↓
Caregiver creates patient profile
        ↓
Patient is linked to caregiver
        ↓
Caregiver adds verified memories and reminders
        ↓
Patient completes daily memory checks
        ↓
System creates personal baseline
        ↓
New results are compared with baseline
        ↓
Repeated deviations create caregiver alerts
        ↓
Patient uses assistant to retrieve verified information
```

---

## 5. MVP Feature Requirements

### 5.1 Authentication and Roles

Users must be able to register and sign in as either a patient or caregiver.

The system must enforce role-based access:

| Role          | Access                              |
| ------------- | ----------------------------------- |
| Patient       | Own profile and authorized memories |
| Caregiver     | Linked patient's data               |
| Unlinked user | No patient data                     |

**User Stories**

- As a caregiver, I want to create an account so that I can manage a patient's information.
- As a patient, I want to sign in securely so that only authorized users can access my data.
- As a caregiver, I want to link to a patient so that I can monitor the correct person.

**Acceptance Criteria**

- Users can register and sign in.
- Each account has a defined role.
- A caregiver can create or invite a patient profile.
- A patient cannot view another patient's data.
- An unlinked caregiver cannot access patient information.
- Unauthorized API requests are rejected.
- Sign-out invalidates the active session.

---

### 5.2 Patient Profile

The caregiver can create and update a patient profile.

**Required fields:**

- Name
- Date of birth or age range
- Profile photo (optional)
- Emergency contact
- Time zone
- Preferred language
- Caregiver relationship

**User Stories**

- As a caregiver, I want to create a patient profile so that the system can personalize assistance.
- As a caregiver, I want to update patient information so that reminders and responses remain accurate.

**Acceptance Criteria**

- A caregiver can create a patient profile.
- Required fields are validated.
- The profile is associated with the correct caregiver.
- Profile changes are saved and displayed consistently.
- Patients can view their own profile.
- Sensitive profile data is not publicly accessible.

---

### 5.3 Verified Memory Timeline

Caregivers can add verified events to the patient's timeline.

**Each event includes:**

- Title
- Date
- Time (optional)
- People involved (optional)
- Notes
- Source
- Created by
- Verification status

**Example**

| Field  | Value               |
| ------ | ------------------- |
| Event  | Doctor appointment  |
| Date   | 25 September        |
| Time   | 12:00 PM            |
| Notes  | Routine appointment |
| Source | Caregiver           |
| Status | Verified            |

**User Stories**

- As a caregiver, I want to add verified events so that the patient can remember important activities.
- As a patient, I want to view today's events so that I can understand what happened.
- As a patient, I want the assistant to answer questions using verified memories.

**Acceptance Criteria**

- A caregiver can create, edit, and delete authorized timeline events.
- Events display in chronological order.
- The system records who created each event.
- Patients can view authorized events.
- The assistant only uses verified timeline data.
- If no matching information exists, the assistant responds: "I don't have that information."
- The system never invents an event or presents an unverified answer as fact.

---

### 5.4 Daily Memory Check

The MVP should include three simple test types:

1. Object recall
2. Orientation
3. Recent-event recall

**Example flow**

```
Start daily check
      ↓
Object recall
      ↓
Orientation questions
      ↓
Recent-event question
      ↓
Calculate result
      ↓
Save result
      ↓
Compare with personal baseline
```

The test should be short, accessible, and repeatable.

**User Stories**

- As a patient, I want to complete a short daily memory check so that the system can track my personal pattern.
- As a caregiver, I want to see whether tests are completed so that I can monitor participation.
- As a caregiver, I want results described as observations rather than diagnoses.

**Acceptance Criteria**

- A patient can start and complete a daily check.
- The system records the date, time, answers, score, and completion status.
- The patient can skip a question without causing an application error.
- The system supports uncertain or partially correct answers.
- A single poor result does not create an alert.
- Results are visible to the linked caregiver.
- The interface states that the check is not a medical diagnosis.

---

### 5.5 Personal Baseline

The system must establish a baseline from the patient's own results rather than comparing the patient with a generic population score.

**For the MVP:**

- Collect at least three completed checks before creating a baseline.
- Calculate a simple average for each test category.
- Store the baseline version and date.
- Recalculate the baseline only according to a defined rule.

**Example**

| Metric                       | Value     |
| ---------------------------- | --------- |
| Object recall baseline       | 85%       |
| Orientation baseline         | 90%       |
| Recent-event recall baseline | 82%       |
| Average response time        | 8 seconds |

**User Stories**

- As a caregiver, I want the system to learn the patient's normal pattern so that changes are interpreted in context.
- As a patient, I want the system to avoid treating one difficult day as a serious problem.

**Acceptance Criteria**

- No baseline is shown before the minimum number of tests is completed.
- The baseline is calculated from the patient's own results.
- The system displays the number of tests used.
- Baseline calculations are reproducible.
- A single low result does not automatically change the baseline.
- Baseline data is visible only to authorized users.

---

### 5.6 Change Detection and Alerts

The MVP should use transparent, configurable rules rather than opaque clinical predictions.

**Example rule**

> If results are below the patient's baseline by a defined threshold for three consecutive completed checks, create an "Attention Needed" alert.

The alert must not claim that the patient has a disease or medical condition.

**User Stories**

- As a caregiver, I want to be notified about repeated changes so that I can check on the patient.
- As a patient, I want the system to avoid alarming me because of one incorrect answer.
- As a caregiver, I want to understand why an alert was created.

**Acceptance Criteria**

- A single poor result is recorded without creating an alert.
- Repeated deviations are evaluated using documented thresholds.
- An alert includes the affected test category, dates, and comparison with baseline.
- Alerts are labeled as observations or attention items.
- Alerts do not contain diagnostic language.
- Caregivers can mark an alert as reviewed.
- The system records the review status and timestamp.
- The patient is not shown alarming clinical conclusions.

---

### 5.7 Memory Assistant

The assistant must answer questions using authorized, verified patient data.

**Supported MVP questions:**

- "What did I do today?"
- "Who visited me today?"
- "When is my appointment?"
- "What reminders do I have?"
- "What is my next scheduled activity?"

**User Stories**

- As a patient, I want to ask simple questions about my day so that I can retrieve important information.
- As a caregiver, I want the assistant to avoid making up memories.
- As a patient, I want responses in simple language.

**Acceptance Criteria**

- The patient can submit a text question.
- The system searches only authorized patient data.
- Responses identify dates and times when available.
- Responses are concise and easy to understand.
- Unknown information produces a clear fallback response.
- The assistant does not infer or invent missing events.
- The assistant does not provide medical diagnoses.
- Access to assistant responses is logged.

---

### 5.8 Reminders

Caregivers can create reminders for:

- Medication
- Appointments
- Meals
- Activities
- Other custom tasks

**Each reminder includes:**

- Title
- Date or recurrence
- Time
- Instructions
- Confirmation status
- Missed-reminder timeout

**User Stories**

- As a caregiver, I want to create reminders so that the patient receives timely prompts.
- As a patient, I want to confirm a reminder after completing it.
- As a caregiver, I want to know when a reminder remains incomplete.

**Acceptance Criteria**

- A caregiver can create, edit, pause, and delete reminders.
- The patient receives reminders at the configured time.
- The patient can mark a reminder as complete.
- The system records completion time.
- If the reminder is not confirmed within the configured period, it is marked missed.
- A missed reminder can create a caregiver notification.
- The system does not claim that medication was taken unless the patient or caregiver confirms it.

---

### 5.9 Caregiver Dashboard

**Required sections:**

- Patient profile
- Today's test status
- Recent memory results
- Baseline comparison
- Active reminders
- Missed reminders
- Recent timeline events
- Open alerts
- Alert review status

**User Stories**

- As a caregiver, I want one dashboard showing the patient's current status.
- As a caregiver, I want to see recent changes without manually searching through records.
- As a caregiver, I want to review and resolve alerts.

**Acceptance Criteria**

- The dashboard displays only linked patients.
- The dashboard shows the latest available data.
- Test completion status is visible.
- Active and missed reminders are distinguishable.
- Alerts show severity, reason, date, and review status.
- Timeline events are displayed chronologically.
- Dashboard data updates after a successful action.
- If realtime updates are not implemented in the first release, the dashboard provides a clear refresh mechanism.

---

### 5.10 Help Request

The patient can request caregiver assistance.

**MVP options:**

- `[Contact Caregiver]`
- `[Cancel]`

The system may display the caregiver's configured contact method but should not automatically contact emergency services.

**User Stories**

- As a patient, I want to request help when I am confused or need assistance.
- As a caregiver, I want to know when the patient requests help.

**Acceptance Criteria**

- The patient can press a clearly visible help button.
- The patient can cancel before sending the request.
- A confirmed request creates a caregiver notification or dashboard alert.
- The request records the time and patient.
- The system does not describe the request as a medical emergency.
- Emergency-service integration is not included in the MVP.

---

### 5.11 Security and Privacy

**Required controls:**

- Authenticated access
- Role-based authorization
- Patient-caregiver relationship checks
- Encrypted transport
- Secure password handling through the authentication provider
- Private file storage
- Audit-friendly event metadata
- No public patient profiles
- No unrestricted AI access to the database

**User Stories**

- As a patient, I want my information protected from unauthorized users.
- As a caregiver, I want access limited to patients I am authorized to support.
- As a product owner, I want sensitive data handled securely from the first release.

**Acceptance Criteria**

- Every patient-data request checks authorization.
- Users cannot access data by changing an ID in a URL or API request.
- Uploaded files are private by default.
- Sensitive data is transmitted over HTTPS.
- Authentication tokens are handled securely.
- The system logs important account and data-access events.
- The application clearly states that it is not a diagnostic medical device.
- Data deletion and account deactivation procedures are documented.

---

## 6. MVP Data Model

### User

| Field      |
| ---------- |
| id         |
| role       |
| name       |
| email      |
| created_at |

### Patient Profile

| Field                |
| -------------------- |
| id                   |
| user_id              |
| name                 |
| date_of_birth_or_age |
| photo_url            |
| timezone             |
| created_at           |
| updated_at           |

### Caregiver Link

| Field        |
| ------------ |
| id           |
| caregiver_id |
| patient_id   |
| status       |
| permissions  |
| created_at   |

### Timeline Event

| Field               |
| ------------------- |
| id                  |
| patient_id          |
| title               |
| description         |
| event_date          |
| event_time          |
| created_by          |
| verification_status |
| created_at          |
| updated_at          |

### Memory Check

| Field              |
| ------------------ |
| id                 |
| patient_id         |
| completed_at       |
| object_score       |
| orientation_score  |
| recent_event_score |
| response_time      |
| status             |

### Baseline

| Field                |
| -------------------- |
| id                   |
| patient_id           |
| object_average       |
| orientation_average  |
| recent_event_average |
| sample_count         |
| created_at           |
| updated_at           |

### Alert

| Field           |
| --------------- |
| id              |
| patient_id      |
| type            |
| reason          |
| related_results |
| status          |
| created_at      |
| reviewed_at     |
| reviewed_by     |

### Reminder

| Field          |
| -------------- |
| id             |
| patient_id     |
| created_by     |
| title          |
| instructions   |
| scheduled_time |
| recurrence     |
| status         |
| completed_at   |
| missed_at      |

### Help Request

| Field       |
| ----------- |
| id          |
| patient_id  |
| created_at  |
| status      |
| resolved_at |

---

## 7. MVP Acceptance Test Scenarios

**Scenario 1 — Caregiver creates a patient**

```
Given a signed-in caregiver
When the caregiver submits valid patient information
Then a patient profile is created
And the caregiver is linked to that patient
```

**Scenario 2 — Patient completes a memory check**

```
Given a linked patient
When the patient completes the daily check
Then the result is saved
And the caregiver can view the result
```

**Scenario 3 — Baseline is created**

```
Given a patient has completed at least three checks
When the system processes the results
Then a personal baseline is created
And the baseline shows the sample count
```

**Scenario 4 — One poor result**

```
Given a patient has an existing baseline
When one test result is below the baseline
Then the result is recorded
And no attention alert is created
```

**Scenario 5 — Repeated deviation**

```
Given a patient has repeated results below the configured threshold
When the defined rule is satisfied
Then an attention alert is created
And the linked caregiver can view it
```

**Scenario 6 — Unknown assistant question**

```
Given no verified event matches the patient's question
When the patient submits the question
Then the assistant says it does not have that information
And does not invent an answer
```

**Scenario 7 — Reminder completion**

```
Given an active reminder
When the patient confirms completion
Then the reminder is marked completed
And the completion time is stored
```

**Scenario 8 — Missed reminder**

```
Given an active reminder
When the patient does not confirm it within the configured period
Then the reminder is marked missed
And the caregiver receives an attention notification
```

**Scenario 9 — Unauthorized access**

```
Given a caregiver who is not linked to a patient
When the caregiver requests that patient's data
Then the request is rejected
And no patient information is returned
```

**Scenario 10 — Help request**

```
Given a signed-in patient
When the patient confirms a help request
Then a caregiver alert is created
And the request appears on the caregiver dashboard
```

---

## 8. MVP Non-Functional Requirements

### Usability

- Patient actions should require minimal steps.
- Text should be readable with large controls.
- The interface should use simple language.
- Important actions should provide confirmation feedback.
- The application should support keyboard navigation where applicable.

### Reliability

- Failed requests should show a clear error message.
- Duplicate submissions should not create duplicate events.
- Test results should not be lost after successful submission.
- Reminder status changes should be idempotent.

### Performance

- Standard dashboard requests should load within an acceptable prototype target.
- Assistant responses should show loading feedback.
- The application should remain usable on common mobile screen sizes.

### Observability

- Errors should be logged without exposing sensitive content unnecessarily.
- Important workflow events should be traceable.
- Alert creation should record the rule that triggered it.

---

## 9. Deferred Features

The following features are intentionally excluded from the MVP.

### 9.1 Face Recognition

Deferred because it requires:

- Biometric data handling
- Consent workflows
- Accuracy testing
- False-match mitigation
- Secure image processing
- Additional privacy review

_The MVP may support manually added family profiles without automated recognition._

### 9.2 Object Recognition

Deferred because it requires:

- Camera integration
- Object-detection models
- Medication and household-object datasets
- Accuracy and safety testing

_The MVP may use manually entered item descriptions._

### 9.3 Voice Assistant

Deferred from the first release unless text interaction is already stable.

Future requirements include:

- Speech-to-text
- Text-to-speech
- Accessibility testing
- Noise handling
- Voice consent and privacy controls

### 9.4 GPS and Safe-Zone Monitoring

Deferred because it requires:

- Continuous location permissions
- Battery management
- Location privacy controls
- False-alarm handling
- Clear caregiver escalation rules

### 9.5 Emergency-Services Integration

Deferred because it requires:

- Local legal and operational review
- Consent and liability controls
- Reliable location handling
- Emergency-provider integration
- High-availability requirements

### 9.6 Doctor or Therapist Portal

Deferred until permission models, reporting requirements, and clinical workflows are defined.

### 9.7 Clinical Diagnosis or Risk Prediction

Not part of the product scope.

**The system must not:**

- Diagnose dementia or Alzheimer's disease
- Predict a medical condition
- Recommend treatment
- Replace professional evaluation
- Present a memory score as a clinical assessment

### 9.8 Advanced AI Reports

Deferred until the system has sufficient validated data.

_The MVP should use structured summaries and transparent rules rather than unrestricted AI-generated clinical interpretations._

### 9.9 Automatic Baseline Adaptation

The MVP should use a controlled baseline process. Automatic continuous adaptation is deferred because it could hide meaningful decline or normalize unusual results.

### 9.10 Native Mobile Applications

The first release may use a responsive web application or progressive web application. Native iOS and Android applications are deferred.

### 9.11 Multi-Patient Caregiver Management

The MVP may support one or a small number of linked patients. Advanced organization management, staff roles, and facility-level administration are deferred.
