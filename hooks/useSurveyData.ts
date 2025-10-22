import { useEffect, useState } from 'react';

export default function useSurveyData(surveyUrl: string | null) {
  const [surveyData, setSurveyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyUrl) {
      setLoading(false);
      return;
    }

    async function fetchSurvey() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(surveyUrl as string);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setSurveyData(data);
      } catch (err) {
        console.error('Failed to load survey:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchSurvey();
  }, [surveyUrl]);

  return { surveyData, loading, error };
}
