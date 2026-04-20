-- Migration: seed_proposal_templates
-- Task 29: Load 3 vertical templates for Beta release.

INSERT INTO public.proposal_templates (name, industry, deal_size, service_type, content, metadata)
VALUES 
(
  'Tech Implementation Proposal', 
  'Technology', 
  'mid-market', 
  'implementation', 
  '# Project Proposal: {{project_title}}\n\n## Client: {{client_name}}\n\n### Overview\nWe are excited to help you implement the software solutions discussed. This project covers: {{project_description}}\n\n### Scope\n1. Setup and Config\n2. User Training\n3. Go-live Support\n\n### Budget\nMid-market flat fee.',
  '{"industry": "Technology", "deal_size": "mid-market", "service_type": "implementation"}'
),
(
  'Retail E-commerce Audit', 
  'Retail', 
  'enterprise', 
  'audit', 
  '# E-commerce Performance Audit: {{project_title}}\n\n## Client: {{client_name}}\n\n### Objectives\nA deep dive into your digital store-front performance: {{project_description}}\n\n### Deliverables\n1. Conversion Audit\n2. SEO Report\n3. Speed Optimization Plan',
  '{"industry": "Retail", "deal_size": "enterprise", "service_type": "audit"}'
),
(
  'Financial Services Compliance Pack', 
  'Finance', 
  'smb', 
  'compliance', 
  '# Compliance Readiness Pack: {{project_title}}\n\n## Client: {{client_name}}\n\n### Summary\nEnsuring your firm meets the latest regulatory standards: {{project_description}}\n\n### Checklist\n- SOC2 Gap Analysis\n- Privacy Policy Review\n- Data Encryption Audit',
  '{"industry": "Finance", "deal_size": "smb", "service_type": "compliance"}'
)
ON CONFLICT DO NOTHING;
