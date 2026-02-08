import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Prediction } from '@/types';

interface PredictionHistoryChartProps {
  predictions: Prediction[];
  questionTitle: string;
}

interface ChartDataPoint {
  timestamp: number;
  date: string;
  communityProbability: number;
  predictionCount: number;
}

export function PredictionHistoryChart({ predictions, questionTitle }: PredictionHistoryChartProps) {
  const chartData = useMemo(() => {
    // Group predictions by user and get only latest per user at each point in time
    const sortedPredictions = [...predictions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const dataPoints: ChartDataPoint[] = [];
    const userLatestPredictions = new Map<string, number>();

    for (const pred of sortedPredictions) {
      // Update this user's latest prediction
      userLatestPredictions.set(pred.user_id, pred.probability);

      // Calculate community prediction (geometric mean of odds)
      const probabilities = Array.from(userLatestPredictions.values());
      const communityProb = calculateCommunityPrediction(probabilities);

      dataPoints.push({
        timestamp: new Date(pred.created_at).getTime(),
        date: format(new Date(pred.created_at), 'd MMM HH:mm', { locale: pl }),
        communityProbability: communityProb,
        predictionCount: probabilities.length,
      });
    }

    return dataPoints;
  }, [predictions]);

  // Calculate geometric mean of odds
  const calculateCommunityPrediction = (probabilities: number[]): number => {
    if (probabilities.length === 0) return 50;

    // Clamp to [0.01, 99.99] to avoid ln(0)
    const clampedProbs = probabilities.map((p) => Math.max(0.01, Math.min(99.99, p)));

    // Convert to odds, take geometric mean, convert back
    const avgLnP = clampedProbs.reduce((sum, p) => sum + Math.log(p / 100), 0) / clampedProbs.length;
    const avgLn1MinusP =
      clampedProbs.reduce((sum, p) => sum + Math.log(1 - p / 100), 0) / clampedProbs.length;

    const numerator = Math.exp(avgLnP);
    const denominator = numerator + Math.exp(avgLn1MinusP);

    return (numerator / denominator) * 100;
  };

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Brak danych do wykresu
      </div>
    );
  }

  // Show simple text if only one data point
  if (chartData.length === 1) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {chartData[0].communityProbability.toFixed(1)}% ({chartData[0].predictionCount}{' '}
        {chartData[0].predictionCount === 1 ? 'predykcja' : 'predykcje'})
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            label={{ value: 'Prawdopodobieństwo (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as ChartDataPoint;
                return (
                  <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="text-sm font-semibold mb-1">{data.date}</p>
                    <p className="text-sm text-primary">
                      Prognoza społeczności: <strong>{data.communityProbability.toFixed(1)}%</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.predictionCount} {data.predictionCount === 1 ? 'predykcja' : 'predykcji'}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="communityProbability"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
            name="Prognoza społeczności (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
