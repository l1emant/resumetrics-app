import { getResumes } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function HistorySidebar() {
  const resumes = getResumes();

  return (
    <Card className="h-full border-l rounded-none border-t-0 border-b-0 border-r-0 shadow-none bg-muted/20">
      <CardHeader>
        <CardTitle className="text-lg">Analysis History</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 h-[calc(100vh-80px)] overflow-y-auto">
        {resumes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No history available yet.</p>
        ) : (
          resumes.map((resume) => (
            <div key={resume.id} className="flex flex-col gap-1 p-3 border rounded-md bg-card shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate max-w-37.5" title={resume.filename}>
                  {resume.filename}
                </span>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  Score: {resume.score}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(resume.created_at || '').toLocaleString()}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
