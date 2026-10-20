import ReactMarkdown from "react-markdown";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
type Work = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  resource_links?: string[];
  resource_paths?: string[];
  submission_type?: string;
};
export function CourseWork({ assignment: a, canManage }: { assignment: Work; canManage: boolean }) {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: a.title,
    description: a.description || "",
    due_date: a.due_date
      ? new Date(new Date(a.due_date).getTime() - new Date(a.due_date).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : "",
    resources: (a.resource_links || []).join("\n"),
    submission_type: a.submission_type || "either",
  });
  const [resourceFiles, setResourceFiles] = useState<File[]>([]);
  const [resourcePaths, setResourcePaths] = useState(a.resource_paths || []);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const submissions = useQuery({
    queryKey: ["assignment-work", a.id, me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("assignment_id", a.id);
      if (error) throw error;
      return data;
    },
  });
  const own = submissions.data?.find((s) => s.student_id === me?.user.id);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await Promise.all(
        [
          "assignment-work",
          "course-workspace-assignments",
          "course-workspace-submissions",
          "mentor-submissions",
          "portal-calendar",
          "dashboard-coursework",
        ].map((k) => qc.invalidateQueries({ queryKey: [k] })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save coursework");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!me) return;
    const paths = [...(own?.file_paths || [])];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) throw new Error("Each file must be under 20 MB");
      const path = `${me.user.id}/${a.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("course-submissions").upload(path, file);
      if (error) throw error;
      paths.push(path);
    }
    const { error } = await supabase.from("submissions").upsert(
      {
        assignment_id: a.id,
        student_id: me.user.id,
        content: content || own?.content || "",
        file_paths: paths,
      },
      { onConflict: "assignment_id,student_id" },
    );
    if (error) throw error;
    setFiles([]);
    toast.success("Work submitted");
  }
  async function saveAssignment() {
    const paths = [...resourcePaths];
    for (const file of resourceFiles) {
      if (file.size > 20 * 1024 * 1024) throw new Error("Each resource must be under 20 MB");
      const path = `${a.course_id}/${a.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("course-resources").upload(path, file);
      if (error) throw error;
      paths.push(path);
    }
    const links = form.resources
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const link of links)
      if (!/^https?:\/\//i.test(link))
        throw new Error("Resource links must begin with https:// or http://");
    const { error } = await supabase
      .from("assignments")
      .update({
        title: form.title,
        description: form.description,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        submission_type: form.submission_type,
        resource_links: links,
        resource_paths: paths,
      })
      .eq("id", a.id);
    if (error) throw error;
    setEditing(false);
    setResourceFiles([]);
    setResourcePaths(paths);
    toast.success("Assignment updated");
  }
  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      {a.resource_links?.map((l) => (
        <a
          key={l}
          className="block break-all text-sm text-primary underline"
          target="_blank"
          rel="noreferrer"
          href={/^https?:\/\//i.test(l) ? l : "#"}
        >
          {l}
        </a>
      ))}
      {a.resource_paths?.map((p) => (
        <FileLink key={p} path={p} bucket="course-resources" />
      ))}
      {submissions.error && (
        <p role="alert" className="text-destructive">
          Could not load submissions.
        </p>
      )}
      {canManage ? (
        <>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            Edit instructions and deadline
          </Button>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(saveAssignment);
              }}
              className="space-y-3"
            >
              <label className="block">
                Title
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label className="block">
                Instructions
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label className="block">
                Due date
                <Input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </label>
              <label className="block">
                Resource links (one per line)
                <Textarea
                  value={form.resources}
                  onChange={(e) => setForm({ ...form, resources: e.target.value })}
                />
              </label>
              {resourcePaths.map((p) => (
                <div key={p} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.split("/").pop()}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setResourcePaths(resourcePaths.filter((item) => item !== p))}
                  >
                    Remove attachment
                  </Button>
                </div>
              ))}
              <label className="block">
                Attach resources (up to 20 MB each)
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => setResourceFiles(Array.from(e.target.files || []))}
                />
              </label>
              <label className="block">
                Submission requirement
                <select
                  className="ml-2 rounded border bg-background p-2"
                  value={form.submission_type}
                  onChange={(e) => setForm({ ...form, submission_type: e.target.value })}
                >
                  <option value="either">Text or file</option>
                  <option value="text">Written response</option>
                  <option value="file">File upload</option>
                </select>
              </label>
              <Button disabled={busy}>Save assignment</Button>
            </form>
          )}
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              Review submissions ({submissions.data?.length || 0})
            </summary>
            <div className="mt-3 space-y-3">
              {submissions.data?.map((s) => (
                <SubmissionReview key={s.id} submission={s} busy={busy} act={act} />
              ))}
            </div>
          </details>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">
            {own ? `Submitted ${new Date(own.submitted_at).toLocaleString()}` : "Not submitted"}
            {own && a.due_date && new Date(own.submitted_at) > new Date(a.due_date)
              ? " · Late submission"
              : ""}
          </p>
          {own?.feedback && (
            <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
              <strong>Mentor feedback: </strong>
              {own.feedback}
            </p>
          )}
          {own?.grade && (
            <p className="text-sm">
              <strong>Grade: </strong>
              {own.grade}
            </p>
          )}
          {own?.file_paths?.map((p) => (
            <FileLink key={p} path={p} />
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(submit);
            }}
            className="space-y-3"
          >
            <label className="block text-sm">
              Your response
              <Textarea
                key={own?.id || "new"}
                defaultValue={own?.content || ""}
                onChange={(e) => setContent(e.target.value)}
                required={a.submission_type === "text"}
              />
            </label>
            <label className="block text-sm">
              Upload work (up to 20 MB per file)
              <Input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                required={a.submission_type === "file" && !own?.file_paths?.length}
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
            <Button disabled={busy || submissions.isLoading || !!submissions.error}>
              {own ? "Update submission" : "Submit work"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
function FileLink({ path, bucket = "course-submissions" }: { path: string; bucket?: string }) {
  return (
    <button
      type="button"
      className="block text-sm text-primary underline"
      onClick={async () => {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
        if (error) toast.error(error.message);
        else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }}
    >
      {path.split("/").pop()}
    </button>
  );
}
function SubmissionReview({
  submission: s,
  busy,
  act,
}: {
  submission: {
    id: string;
    student_id: string;
    content: string;
    feedback: string | null;
    grade: string | null;
    file_paths: string[];
    submitted_at: string;
  };
  busy: boolean;
  act: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState(s.feedback || "");
  const [grade, setGrade] = useState(s.grade || "");
  const member = useQuery({
    queryKey: ["course-student-name", s.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", s.student_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm font-medium">
        {member.data?.full_name || s.student_id} · {new Date(s.submitted_at).toLocaleString()}
      </p>
      <p className="whitespace-pre-wrap text-sm">{s.content}</p>
      {s.file_paths?.map((p) => (
        <FileLink key={p} path={p} />
      ))}
      <label className="block text-sm">
        Grade
        <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
      </label>
      <label className="block text-sm">
        Feedback
        <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </label>
      <Button
        disabled={busy}
        onClick={() =>
          void act(async () => {
            const { error } = await supabase
              .from("submissions")
              .update({ feedback: feedback.trim() || null, grade: grade.trim() || null })
              .eq("id", s.id);
            if (error) throw error;
            toast.success("Feedback saved");
          })
        }
      >
        Save feedback
      </Button>
    </div>
  );
}
export function CourseDiscussion({
  courseId,
  canManage,
}: {
  courseId: string;
  canManage: boolean;
}) {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", kind: "discussion" });
  const [busy, setBusy] = useState(false);
  const posts = useQuery({
    queryKey: ["course-posts", courseId],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_posts")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-display text-2xl">Course announcements, discussions, and resources</h2>
      {posts.error && (
        <p role="alert" className="text-destructive">
          Could not load discussions.
        </p>
      )}
      {canManage && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const { error } = await supabase
                .from("course_posts")
                .insert({ ...form, course_id: courseId, author_id: me!.user.id });
              if (error) throw error;
              setForm({ ...form, title: "", body: "" });
              void qc.invalidateQueries({ queryKey: ["course-posts"] });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not publish");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block">
            Post type
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              className="ml-2 rounded border bg-background p-2"
            >
              {["discussion", "announcement", "resource"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="block">
            Title
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block">
            Message or resource links
            <Textarea
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>
          <Button disabled={busy}>Publish to course</Button>
        </form>
      )}
      {posts.data?.map((p) => (
        <DiscussionPost key={p.id} post={p} canManage={canManage} />
      ))}
      {posts.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">No course discussions yet.</p>
      )}
    </Card>
  );
}
function DiscussionPost({
  post: p,
  canManage,
}: {
  post: { id: string; title: string; body: string; kind: string; author_id: string };
  canManage: boolean;
}) {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [postForm, setPostForm] = useState({ title: p.title, body: p.body });
  const replies = useQuery({
    queryKey: ["course-replies", p.id],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_replies")
        .select("*")
        .eq("post_id", p.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  return (
    <article className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">
          {p.title} <span className="text-xs capitalize text-muted-foreground">{p.kind}</span>
        </h3>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { error } = await supabase.from("course_posts").delete().eq("id", p.id);
                if (error) toast.error(error.message);
                else void qc.invalidateQueries({ queryKey: ["course-posts"] });
              }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
      {editing && canManage && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const { error } = await supabase.from("course_posts").update(postForm).eq("id", p.id);
              if (error) throw error;
              setEditing(false);
              void qc.invalidateQueries({ queryKey: ["course-posts"] });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not update post");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            Title
            <Input
              required
              value={postForm.title}
              onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Message
            <Textarea
              required
              value={postForm.body}
              onChange={(e) => setPostForm({ ...postForm, body: e.target.value })}
            />
          </label>
          <Button size="sm" disabled={busy}>
            Save post
          </Button>
        </form>
      )}
      <div className="space-y-2 text-sm [&_a]:text-primary [&_a]:underline">
        <ReactMarkdown>{p.body}</ReactMarkdown>
      </div>
      {replies.error && <p role="alert">Could not load replies.</p>}
      {replies.data?.map((r) => (
        <div key={r.id} className="rounded-lg bg-muted p-3 text-sm">
          <span className="text-xs text-muted-foreground">
            {r.author_id === me?.user.id ? "You" : "Course member"} ·{" "}
            {new Date(r.created_at).toLocaleString()}
          </span>
          <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
        </div>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const { error } = await supabase
              .from("course_replies")
              .insert({ post_id: p.id, author_id: me!.user.id, body: body.trim() });
            if (error) throw error;
            setBody("");
            void qc.invalidateQueries({ queryKey: ["course-replies", p.id] });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not send reply");
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-2"
      >
        <label className="block text-sm">
          Reply
          <Textarea
            required
            maxLength={10000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <Button size="sm" disabled={busy || !body.trim()}>
          Post reply
        </Button>
      </form>
    </article>
  );
}
