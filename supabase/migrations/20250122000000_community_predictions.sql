-- Add community prediction calculation using geometric mean of odds
-- Based on: https://forum.effectivealtruism.org/posts/sMjcjnnpoAQCcedL2/when-pooling-forecasts-use-the-geometric-mean-of-odds

-- Function to calculate community prediction for a question using geometric mean of odds
-- Formula: p = (∏pᵢ^(1/N)) / (∏pᵢ^(1/N) + ∏(1-pᵢ)^(1/N))
-- Equivalent to: p = exp(avg(ln(p))) / (exp(avg(ln(p))) + exp(avg(ln(1-p))))
CREATE OR REPLACE FUNCTION public.calculate_community_prediction(question_uuid UUID)
RETURNS TABLE(
  question_id UUID,
  community_probability REAL,
  prediction_count INTEGER
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  avg_ln_p REAL;
  avg_ln_1_minus_p REAL;
  numerator REAL;
  denominator REAL;
  count_predictions INTEGER;
BEGIN
  -- Get count and averages of log probabilities
  -- Clamp probabilities to [0.01, 99.99] to avoid ln(0) and division by zero
  SELECT
    COUNT(*)::INTEGER,
    AVG(LN(GREATEST(0.01, LEAST(99.99, probability::REAL)) / 100.0)),
    AVG(LN(1.0 - GREATEST(0.01, LEAST(99.99, probability::REAL)) / 100.0))
  INTO count_predictions, avg_ln_p, avg_ln_1_minus_p
  FROM public.predictions
  WHERE predictions.question_id = question_uuid;

  -- If no predictions, return NULL
  IF count_predictions = 0 OR avg_ln_p IS NULL OR avg_ln_1_minus_p IS NULL THEN
    RETURN QUERY SELECT question_uuid, NULL::REAL, 0::INTEGER;
    RETURN;
  END IF;

  -- Calculate geometric mean of odds and convert back to probability
  -- p = exp(avg(ln(p))) / (exp(avg(ln(p))) + exp(avg(ln(1-p))))
  numerator := EXP(avg_ln_p);
  denominator := numerator + EXP(avg_ln_1_minus_p);

  RETURN QUERY SELECT
    question_uuid,
    (numerator / denominator * 100)::REAL,
    count_predictions;
END;
$$;

-- Create a view for easy access to community predictions for all questions
CREATE OR REPLACE VIEW public.community_predictions AS
SELECT
  q.id AS question_id,
  q.title,
  q.close_date,
  q.resolution_status,
  cp.community_probability,
  cp.prediction_count
FROM public.questions q
LEFT JOIN LATERAL public.calculate_community_prediction(q.id) cp ON true;

-- Grant access to the function and view
GRANT EXECUTE ON FUNCTION public.calculate_community_prediction(UUID) TO anon, authenticated;
GRANT SELECT ON public.community_predictions TO anon, authenticated;
