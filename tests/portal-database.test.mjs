import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
process.on("uncaughtException", (e) => {
  console.error(e.message);
  process.exit(1);
});
const db = new PGlite();
// Minimal Supabase-managed schemas. Application migrations run unchanged.
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text,raw_user_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user) $$;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
 GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
 CREATE PUBLICATION supabase_realtime;
 -- Hosted Supabase grants public tables/functions by default. Validate that our
 -- explicit revokes and policies remain safe under those defaults.
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
`);
for (const name of (await readdir("supabase/migrations"))
  .filter((n) => n.endsWith(".sql"))
  .sort()) {
  try {
    await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
  } catch (e) {
    console.error(`Migration failed: ${name}\n${e.message} position ${e.position}`);
    const sql = await readFile(`supabase/migrations/${name}`, "utf8");
    console.error(sql.slice(Number(e.position) - 180, Number(e.position) + 180));
    process.exit(1);
  }
}
console.log("All migrations applied.");
const ids = Object.fromEntries(
  ["officer", "mentor", "otherMentor", "learner", "otherLearner", "pending"].map((k, i) => [
    k,
    `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  ]),
);
for (const [name, id] of Object.entries(ids)) {
  await db.query(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)`, [
    id,
    `${name}@example.org`,
    JSON.stringify({ full_name: name, cohort_preference: "Advanced" }),
  ]);
  if (name !== "pending")
    await db.query(
      `UPDATE applications SET status='approved',cohort_preference='Advanced' WHERE user_id=$1`,
      [id],
    );
}
await db.query(
  `INSERT INTO user_roles(user_id,role) VALUES($1,'officer'),($2,'mentor'),($3,'mentor')`,
  [ids.officer, ids.mentor, ids.otherMentor],
);
const course = (
  await db.query(
    `INSERT INTO courses(mentor_id,title) VALUES($1,'Research methods') RETURNING id`,
    [ids.mentor],
  )
).rows[0].id;
const otherCourse = (
  await db.query(`INSERT INTO courses(mentor_id,title) VALUES($1,'Other course') RETURNING id`, [
    ids.otherMentor,
  ])
).rows[0].id;
await db.query(`INSERT INTO course_enrollments(course_id,student_id) VALUES($1,$2),($3,$4)`, [
  course,
  ids.learner,
  otherCourse,
  ids.otherLearner,
]);
const assignment = (
  await db.query(
    `INSERT INTO assignments(course_id,title,due_date) VALUES($1,'Paper review',now()+interval '20 hours') RETURNING id`,
    [course],
  )
).rows[0].id;
await db.query(`INSERT INTO assignments(course_id,title,status) VALUES($1,'Draft','hidden')`, [
  course,
]);
async function as(user, fn) {
  await db.query(
    `SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)`,
    [ids[user] || user],
  );
  await db.exec("SET ROLE authenticated");
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
    await db.exec(
      `SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claim.role','',false)`,
    );
  }
}
let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    throw e;
  }
}
async function denied(sql, params = []) {
  await assert.rejects(db.query(sql, params));
}
await check(
  "Learners and mentors see only assigned courses, officers retain oversight",
  async () => {
    for (const user of ["learner", "mentor", "otherLearner", "otherMentor"])
      assert.equal((await as(user, () => db.query("SELECT * FROM courses"))).rows.length, 1);
    assert.equal((await as("officer", () => db.query("SELECT * FROM courses"))).rows.length, 2);
    assert.equal((await as("learner", () => db.query("SELECT * FROM assignments"))).rows.length, 1);
    assert.equal(
      (await as("otherMentor", () => db.query("SELECT * FROM assignments"))).rows.length,
      0,
    );
  },
);
await check(
  "Pending applicants cannot approve themselves, edit verification, or access courses",
  async () => {
    await as("pending", async () => {
      await denied(`UPDATE applications SET status='approved' WHERE user_id=$1`, [ids.pending]);
      await denied(`UPDATE profiles SET verification_status='verified' WHERE id=$1`, [ids.pending]);
      assert.equal((await db.query("SELECT * FROM courses")).rows.length, 0);
    });
  },
);
await check("Private contact details are scoped; member directory returns no emails", async () => {
  const rows = (await as("mentor", () => db.query("SELECT id FROM profiles"))).rows;
  assert(rows.some((p) => p.id === ids.learner));
  assert(!rows.some((p) => p.id === ids.otherLearner));
  const dir = (await as("learner", () => db.query("SELECT * FROM portal_directory()"))).rows;
  assert(dir.length >= 5);
  assert(!("email" in dir[0]));
});
await check(
  "Course submissions accept work, prevent self-grading and identity changes",
  async () => {
    await as("learner", async () => {
      await db.query(
        `INSERT INTO submissions(assignment_id,student_id,content) VALUES($1,$2,'My work')`,
        [assignment, ids.learner],
      );
      await denied(`UPDATE submissions SET grade='A' WHERE assignment_id=$1`, [assignment]);
      await denied(`UPDATE submissions SET student_id=$1 WHERE assignment_id=$2`, [
        ids.otherLearner,
        assignment,
      ]);
    });
    await as("otherLearner", () =>
      denied(
        `INSERT INTO submissions(assignment_id,student_id,content) VALUES($1,$2,'Not enrolled')`,
        [assignment, ids.otherLearner],
      ),
    );
    await as("mentor", () =>
      db.query(`UPDATE submissions SET feedback='Well done',grade='95' WHERE assignment_id=$1`, [
        assignment,
      ]),
    );
    assert.equal(
      (
        await as("learner", () =>
          db.query(`SELECT grade FROM submissions WHERE assignment_id=$1`, [assignment]),
        )
      ).rows[0].grade,
      "95",
    );
  },
);
await check("Only officers can move enrollments and pair learners", async () => {
  await as("mentor", () =>
    denied("SELECT move_course_enrollment($1,$2,NULL)", [ids.learner, otherCourse]),
  );
  await as("officer", () =>
    db.query("SELECT move_course_enrollment($1,$2,$3)", [ids.learner, otherCourse, course]),
  );
  assert.equal(
    (await as("learner", () => db.query("SELECT id FROM courses"))).rows[0].id,
    otherCourse,
  );
  await as("officer", () =>
    db.query("SELECT move_course_enrollment($1,$2,$3)", [ids.learner, course, otherCourse]),
  );
});
await check("Help Desk questions and replies stay private", async () => {
  const ticket = (
    await as("learner", () =>
      db.query(
        `INSERT INTO help_tickets(requester_id,subject) VALUES($1,'A private question') RETURNING id`,
        [ids.learner],
      ),
    )
  ).rows[0].id;
  await as("learner", () =>
    db.query(`INSERT INTO help_replies(ticket_id,author_id,body) VALUES($1,$2,'Please help')`, [
      ticket,
      ids.learner,
    ]),
  );
  assert.equal(
    (await as("otherLearner", () => db.query("SELECT * FROM help_tickets"))).rows.length,
    0,
  );
  assert.equal((await as("mentor", () => db.query("SELECT * FROM help_replies"))).rows.length, 0);
  await as("otherLearner", () =>
    denied(`INSERT INTO help_replies(ticket_id,author_id,body) VALUES($1,$2,'Unauthorized')`, [
      ticket,
      ids.otherLearner,
    ]),
  );
  await as("officer", () =>
    db.query(
      `INSERT INTO help_replies(ticket_id,author_id,body) VALUES($1,$2,'Officer response')`,
      [ticket, ids.officer],
    ),
  );
  assert.equal((await as("learner", () => db.query("SELECT * FROM help_replies"))).rows.length, 2);
});
await check("Course discussion replies require enrollment", async () => {
  const post = (
    await as("mentor", () =>
      db.query(
        `INSERT INTO course_posts(course_id,author_id,title,body) VALUES($1,$2,'Discussion','Welcome') RETURNING id`,
        [course, ids.mentor],
      ),
    )
  ).rows[0].id;
  await as("learner", () =>
    db.query(`INSERT INTO course_replies(post_id,author_id,body) VALUES($1,$2,'My reply')`, [
      post,
      ids.learner,
    ]),
  );
  await as("otherLearner", () =>
    denied(`INSERT INTO course_replies(post_id,author_id,body) VALUES($1,$2,'Unauthorized')`, [
      post,
      ids.otherLearner,
    ]),
  );
});
await check(
  "Admissions audiences publish atomically and notify only selected learners",
  async () => {
    const payload = {
      title: "Private admissions task",
      instructions: "For selected applicants",
      targets_only: true,
      status: "published",
      submission_types: ["text"],
    };
    const result = await as("officer", () =>
      db.query("SELECT save_admissions_assignment(NULL,$1,$2) id", [
        JSON.stringify(payload),
        [ids.pending],
      ]),
    );
    const id = result.rows[0].id;
    assert.equal(
      (
        await as("pending", () =>
          db.query("SELECT * FROM admissions_assignments WHERE id=$1", [id]),
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await as("learner", () =>
          db.query("SELECT * FROM admissions_assignments WHERE id=$1", [id]),
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (await as("mentor", () => db.query("SELECT * FROM admissions_assignments WHERE id=$1", [id])))
        .rows.length,
      0,
    );
    const notified = (
      await db.query(
        `SELECT user_id FROM notifications WHERE category='assignments' AND body='Private admissions task'`,
      )
    ).rows;
    assert.deepEqual(
      notified.map((n) => n.user_id),
      [ids.pending],
    );
  },
);
let event;
await check(
  "Event capacity, duplicate registrations, cancellation, and registration deadlines",
  async () => {
    event = (
      await as("officer", () =>
        db.query(
          `INSERT INTO portal_events(title,starts_at,ends_at,capacity,created_by) VALUES('Workshop',now()+interval '20 hours',now()+interval '21 hours',1,$1) RETURNING id`,
          [ids.officer],
        ),
      )
    ).rows[0].id;
    await as("learner", () => db.query("SELECT register_portal_event($1)", [event]));
    await as("learner", () => db.query("SELECT register_portal_event($1)", [event]));
    assert.equal((await db.query("SELECT * FROM event_registrations")).rows.length, 1);
    await as("otherLearner", () => denied("SELECT register_portal_event($1)", [event]));
    await as("learner", () => db.query("SELECT register_portal_event($1,true)", [event]));
    await as("otherLearner", () => db.query("SELECT register_portal_event($1)", [event]));
    await as("officer", () =>
      db.query(`UPDATE portal_events SET cancelled=true WHERE id=$1`, [event]),
    );
    await as("learner", () => denied("SELECT register_portal_event($1)", [event]));
    await as("officer", () =>
      db.query(
        `UPDATE portal_events SET cancelled=false,registration_deadline=now()-interval '1 minute' WHERE id=$1`,
        [event],
      ),
    );
    await as("otherLearner", () => db.query("SELECT register_portal_event($1,true)", [event]));
    await as("learner", () => denied("SELECT register_portal_event($1)", [event]));
  },
);
let slot;
await check("Reviewer availability cannot overlap; private meeting links are hidden", async () => {
  slot = (
    await as("mentor", () =>
      db.query(
        `INSERT INTO interview_slots(mentor_id,leader_id,starts_at,ends_at,meeting_link) VALUES($1,$2,now()+interval '22 hours',now()+interval '23 hours','https://example.org/private-interview') RETURNING id`,
        [ids.mentor, ids.officer],
      ),
    )
  ).rows[0].id;
  await as("otherMentor", () =>
    denied(
      `INSERT INTO interview_slots(mentor_id,leader_id,starts_at,ends_at,meeting_link) VALUES($1,$2,now()+interval '22 hours 30 minutes',now()+interval '23 hours 30 minutes','https://example.org/overlap')`,
      [ids.otherMentor, ids.officer],
    ),
  );
  assert.equal(
    (await as("learner", () => db.query("SELECT * FROM interview_slots"))).rows.length,
    0,
  );
  assert.equal(
    (await as("learner", () => db.query("SELECT * FROM available_interview_slots()"))).rows.length,
    1,
  );
});
await check(
  "Portfolio stages, interview booking uniqueness, privacy, and decision placement",
  async () => {
    for (const name of ["learner", "otherLearner"]) {
      await as(name, () =>
        denied(
          `SELECT save_cohort_portfolio('Topic','Experience','Skills','Previous work',$1,true)`,
          [`${ids[name]}/not-uploaded.pdf`],
        ),
      );
      await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('cohort-portfolios',$1)`, [
        `${ids[name]}/paper.pdf`,
      ]);
      await as(name, () =>
        db.query(
          `SELECT save_cohort_portfolio('Topic','Experience','Skills','Previous work',$1,true)`,
          [`${ids[name]}/paper.pdf`],
        ),
      );
      const application = (
        await db.query("SELECT id FROM cohort_applications WHERE user_id=$1", [ids[name]])
      ).rows[0].id;
      await as("officer", () =>
        db.query(`SELECT review_cohort_application($1,'Interview Scheduling')`, [application]),
      );
    }
    await as("learner", () => db.query("SELECT book_cohort_interview($1)", [slot]));
    await as("otherLearner", () => denied("SELECT book_cohort_interview($1)", [slot]));
    assert.equal(
      (await as("learner", () => db.query("SELECT * FROM interview_slots"))).rows.length,
      1,
    );
    assert.equal(
      (await as("otherLearner", () => db.query("SELECT * FROM interview_bookings"))).rows.length,
      0,
    );
    assert.equal(
      (
        await as("otherMentor", () =>
          db.query("SELECT * FROM cohort_applications WHERE user_id=$1", [ids.learner]),
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await as("mentor", () =>
          db.query("SELECT * FROM cohort_applications WHERE user_id=$1", [ids.learner]),
        )
      ).rows.length,
      1,
    );
    await as("mentor", () =>
      denied(`UPDATE interview_slots SET starts_at=starts_at+interval '1 hour' WHERE id=$1`, [
        slot,
      ]),
    );
    const application = (
      await db.query("SELECT id FROM cohort_applications WHERE user_id=$1", [ids.learner])
    ).rows[0].id;
    await as("officer", () =>
      db.query(`SELECT review_cohort_application($1,'Decision Released','Accepted',$2)`, [
        application,
        course,
      ]),
    );
    assert.equal(
      (
        await as("learner", () =>
          db.query("SELECT status,decision FROM cohort_applications WHERE id=$1", [application]),
        )
      ).rows[0].status,
      "Decision Released",
    );
  },
);
await check(
  "Activity notifications create both delivery channels; SMS requires explicit consent",
  async () => {
    const notes = (await db.query(`SELECT * FROM notifications WHERE user_id=$1`, [ids.learner]))
      .rows;
    assert(notes.some((n) => n.title === "Membership approved"));
    assert(notes.some((n) => n.title === "Assignment feedback available"));
    assert(notes.some((n) => n.title === "Beyond Medicine Help Desk"));
    const count = (
      await db.query(
        `SELECT count(*)::int n FROM notification_deliveries WHERE notification_id IN (SELECT id FROM notifications WHERE user_id=$1)`,
        [ids.learner],
      )
    ).rows[0].n;
    assert.equal(count, notes.length * 2);
    await as("learner", async () => {
      await denied(`UPDATE notification_preferences SET sms_enabled=true WHERE user_id=$1`, [
        ids.learner,
      ]);
      await db.query(
        `UPDATE notification_preferences SET sms_enabled=true,phone='+12025550123' WHERE user_id=$1`,
        [ids.learner],
      );
      assert(
        (await db.query("SELECT sms_consent_at FROM notification_preferences")).rows[0]
          .sms_consent_at,
      );
      await denied("SELECT queue_portal_reminders()");
      await denied("SELECT * FROM claim_notification_deliveries(40)");
    });
  },
);
await check("Reminder runs deduplicate; workers lease each job only once", async () => {
  await db.query("SELECT queue_portal_reminders()");
  const count = (await db.query("SELECT count(*)::int n FROM notifications")).rows[0].n;
  await db.query("SELECT queue_portal_reminders()");
  assert.equal((await db.query("SELECT count(*)::int n FROM notifications")).rows[0].n, count);
  const first = (await db.query("SELECT * FROM claim_notification_deliveries(10)")).rows;
  const second = (await db.query("SELECT * FROM claim_notification_deliveries(10)")).rows;
  assert(first.length > 0);
  assert(second.every((j) => !first.some((f) => f.id === j.id)));
});
await check("Private attachments enforce course, assignment, and learner ownership", async () => {
  const resource = `${course}/${assignment}/guide.pdf`,
    submitted = `${ids.learner}/${assignment}/work.pdf`;
  await as("mentor", () =>
    db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('course-resources',$1)`, [
      resource,
    ]),
  );
  await as("learner", () =>
    db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES('course-submissions',$1)`, [
      submitted,
    ]),
  );
  assert.equal(
    (
      await as("learner", () =>
        db.query(`SELECT name FROM storage.objects WHERE name=$1`, [resource]),
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await as("otherLearner", () =>
        db.query(`SELECT name FROM storage.objects WHERE name IN ($1,$2)`, [resource, submitted]),
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await as("mentor", () =>
        db.query(`SELECT name FROM storage.objects WHERE name=$1`, [submitted]),
      )
    ).rows.length,
    1,
  );
  await as("otherMentor", () =>
    denied(`INSERT INTO storage.objects(bucket_id,name) VALUES('course-resources',$1)`, [
      `${course}/${assignment}/wrong.pdf`,
    ]),
  );
});
await check("Custom meetings cannot be accessed by self-invitation", async () => {
  const meeting = (
    await as("officer", () =>
      db.query(
        `INSERT INTO meetings(title,starts_at,visibility,created_by) VALUES('Private appointment',now()+interval '20 hours','custom',$1) RETURNING id`,
        [ids.officer],
      ),
    )
  ).rows[0].id;
  await as("officer", () =>
    db.query(`INSERT INTO meeting_attendees(meeting_id,user_id) VALUES($1,$2)`, [
      meeting,
      ids.learner,
    ]),
  );
  assert.equal(
    (await as("learner", () => db.query(`SELECT id FROM meetings WHERE id=$1`, [meeting]))).rows
      .length,
    1,
  );
  assert.equal(
    (await as("otherLearner", () => db.query(`SELECT id FROM meetings WHERE id=$1`, [meeting])))
      .rows.length,
    0,
  );
  await as("otherLearner", () =>
    denied(`INSERT INTO meeting_attendees(meeting_id,user_id) VALUES($1,$2)`, [
      meeting,
      ids.otherLearner,
    ]),
  );
});
await check(
  "Notification content is immutable to members; confirmed auth emails sync safely",
  async () => {
    await as("learner", () =>
      denied(`UPDATE notifications SET body='Forged' WHERE user_id=$1`, [ids.learner]),
    );
    await as("learner", () =>
      denied(`UPDATE profiles SET email='unverified@example.org' WHERE id=$1`, [ids.learner]),
    );
    await db.query(`UPDATE auth.users SET email='confirmed@example.org' WHERE id=$1`, [
      ids.learner,
    ]);
    assert.equal(
      (await db.query(`SELECT email FROM profiles WHERE id=$1`, [ids.learner])).rows[0].email,
      "confirmed@example.org",
    );
  },
);
await check(
  "Unread counts, read receipts, and suspension are enforced in the database",
  async () => {
    const conv = (
      await as("learner", () =>
        db.query("SELECT start_direct_conversation($1) id", [ids.otherLearner]),
      )
    ).rows[0].id;
    await as("learner", () =>
      db.query(`INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,'Hello')`, [
        conv,
        ids.learner,
      ]),
    );
    assert.equal(
      (await as("otherLearner", () => db.query("SELECT portal_unread_message_count() n"))).rows[0]
        .n,
      1,
    );
    await as("otherLearner", () => db.query("SELECT mark_conversation_read($1)", [conv]));
    assert.equal(
      (await as("otherLearner", () => db.query("SELECT portal_unread_message_count() n"))).rows[0]
        .n,
      0,
    );
    await db.query(`UPDATE profiles SET status='suspended' WHERE id=$1`, [ids.learner]);
    await as("learner", async () => {
      assert.equal((await db.query("SELECT * FROM courses")).rows.length, 0);
      assert.equal((await db.query("SELECT * FROM messages")).rows.length, 0);
      assert.equal((await db.query("SELECT * FROM help_tickets")).rows.length, 0);
      assert.equal((await db.query("SELECT * FROM cohort_applications")).rows.length, 0);
      await denied(
        `INSERT INTO messages(conversation_id,sender_id,body) VALUES($1,$2,'Should fail')`,
        [conv, ids.learner],
      );
      await denied(`UPDATE profiles SET status='active' WHERE id=$1`, [ids.learner]);
    });
  },
);
console.log(`${passed} database integration checks passed.`);
await db.close();
