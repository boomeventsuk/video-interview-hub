-- Soften candidate-facing wording from "video interview" to "video intro".

UPDATE public.interview_templates
SET description = 'Some jobs look good on paper. This one looks good on people''s faces. The Silent Disco Project CIC uses music and wireless headphones to bring joy, movement and connection to schools, care homes, SEND groups and community settings across Northamptonshire. This short video intro has one intro question and four short questions. Candidates get one minute to think and one minute to answer each question.'
WHERE id = '8d42b52e-32a8-4d25-9b97-cd40b738969f';

UPDATE public.interview_templates
SET description = 'Thanks for applying for casual Event Assistant work with Boombastic Events. This short video intro is for ad hoc paid event work in Northampton and surrounding areas, helping with setup, door scanning, guest support, quick phone footage where needed, and packdown. You will get one minute to think and one minute to answer each question. Once we have reviewed the videos, we will arrange short video calls with the strongest fits.'
WHERE id = '47ec094e-58d5-4fd4-a70f-519b76df3a20';
