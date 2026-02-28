# Connector Expansion Plan

## Research Summary

Using Smithery CLI and Exa web search, we researched ATS platforms with **public, no-auth JSON APIs** — the same pattern used by our existing Greenhouse and Lever connectors. Three strong candidates emerged, all confirmed working with live API tests.

---

## Current State

| Connector | Source Type | API Pattern | Status |
|-----------|------------|-------------|--------|
| GitHub Issues | `github_repo` | GitHub REST API (public repos) | Implemented |
| Greenhouse Board | `greenhouse_board` | `GET boards-api.greenhouse.io/v1/boards/{token}/jobs` | Implemented |
| Lever Postings | `lever_postings` | `GET api.lever.co/v0/postings/{site}` | Implemented |

---

## Proposed New Connectors (Priority Order)

### 1. Ashby Job Board — HIGH PRIORITY

**Why:** Growing ATS among tech companies, especially startups. Public API, no auth, rich data including compensation, remote status, and structured locations.

**Endpoint:**
```
GET https://api.ashbyhq.com/posting-api/job-board/{boardName}?includeCompensation=true
```

**Response shape:**
```json
{
  "apiVersion": "1",
  "jobs": [
    {
      "id": "uuid",
      "title": "Product Manager",
      "location": "Houston, TX",
      "secondaryLocations": [{ "location": "San Francisco", "address": {...} }],
      "department": "Product",
      "team": "Growth",
      "isListed": true,
      "isRemote": true,
      "workplaceType": "Remote",
      "employmentType": "FullTime",
      "descriptionHtml": "<p>...</p>",
      "descriptionPlain": "...",
      "publishedAt": "2021-04-30T16:21:55.393+00:00",
      "jobUrl": "https://jobs.ashbyhq.com/example_job",
      "applyUrl": "https://jobs.ashbyhq.com/example/apply",
      "address": {
        "postalAddress": {
          "addressLocality": "Houston",
          "addressRegion": "Texas",
          "addressCountry": "USA"
        }
      }
    }
  ],
  "compensation": {
    "compensationTierSummary": "$81K – $87K",
    "scrapeableCompensationSalarySummary": "$81K - $87K"
  }
}
```

**Key fields mapping → NormalizedSourceJob:**
| Ashby Field | NormalizedSourceJob Field |
|-------------|-------------------------|
| `id` | `externalJobId` |
| `title` | `title` |
| `descriptionPlain` / `descriptionHtml` | `body` |
| `jobUrl` | `issueUrl` |
| `applyUrl` | `applyUrl` |
| `publishedAt` | `createdAt` / `updatedAt` |
| `department`, `team`, `employmentType` | `labels` |
| `location` + `isRemote` | parsed into body |

**Board name resolution:** Same as Greenhouse/Lever — from `externalKey` or `repo` field on `SourceRecord`.

**Attribution:**
- Label: `Ashby Job Board API`
- URL: `https://developers.ashbyhq.com/docs/public-job-posting-api`
- Terms: `https://www.ashbyhq.com/terms-of-service`

---

### 2. Workable Widget — HIGH PRIORITY

**Why:** 5,000+ companies, 80K+ active jobs. Public widget API, no auth, simple JSON. Widely used by mid-market companies globally.

**Endpoint:**
```
GET https://apply.workable.com/api/v1/widget/accounts/{clientName}
```

**Response shape:**
```json
{
  "name": "Rentokil Initial",
  "description": null,
  "jobs": [
    {
      "title": "Sales Trainee",
      "shortcode": "7B82E689A3",
      "code": "",
      "employment_type": "",
      "telecommuting": false,
      "department": "ROW",
      "url": "https://apply.workable.com/j/7B82E689A3",
      "shortlink": "https://apply.workable.com/j/7B82E689A3",
      "application_url": "https://apply.workable.com/j/7B82E689A3/apply",
      "published_on": "2026-02-13",
      "created_at": "2026-02-13",
      "country": "South Africa",
      "city": "Cape Town",
      "state": "Western Cape",
      "education": "",
      "experience": "",
      "function": "",
      "industry": "Environmental Services",
      "locations": [
        {
          "country": "South Africa",
          "countryCode": "ZA",
          "city": "Cape Town",
          "region": "Western Cape",
          "hidden": false
        }
      ]
    }
  ]
}
```

**Key fields mapping → NormalizedSourceJob:**
| Workable Field | NormalizedSourceJob Field |
|----------------|-------------------------|
| `shortcode` | `externalJobId` |
| `title` | `title` |
| (no description in widget API) | `body` (compose from location/dept/industry) |
| `url` | `issueUrl` |
| `application_url` | `applyUrl` |
| `published_on` | `createdAt` |
| `created_at` | `updatedAt` |
| `department`, `employment_type`, `industry` | `labels` |
| `city`, `state`, `country`, `telecommuting` | parsed into body |

**Limitation:** The widget API does NOT return job descriptions. For richer data, a per-job detail fetch could be explored (or rely on job parser from the body/title). This is still valuable for job discovery even without full descriptions.

**Client name resolution:** Same pattern — from `externalKey` or `repo`.

**Attribution:**
- Label: `Workable Widget API`
- URL: `https://developers.workable.com/`
- Terms: `https://www.workable.com/terms`

---

### 3. Recruitee Careers Site — MEDIUM PRIORITY

**Why:** Public careers-site API, no auth, rich data including description, requirements, tags, location, salary info. Used by European tech companies.

**Endpoint:**
```
GET https://{companySlug}.recruitee.com/api/offers/
```

**Response shape:**
```json
{
  "offers": [
    {
      "id": 2504294,
      "title": "Quality Assurance Engineer",
      "slug": "quality-assurance-engineer",
      "department": "Engineering",
      "location": "Utrecht, Netherlands",
      "city": "Utrecht",
      "country": "Netherlands",
      "country_code": "NL",
      "remote": false,
      "hybrid": false,
      "on_site": true,
      "employment_type_code": "full_time",
      "experience_code": "mid_level",
      "education_code": "bachelor_degree",
      "min_hours": 32,
      "max_hours": 40,
      "salary": null,
      "status": "published",
      "published_at": "2025-01-15T...",
      "created_at": "2025-01-15T...",
      "updated_at": "2025-02-01T...",
      "description": "<html>...",
      "requirements": "<html>...",
      "tags": ["Engineering", "QA"],
      "careers_url": "https://channable.recruitee.com/o/...",
      "careers_apply_url": "https://channable.recruitee.com/o/.../c/new",
      "company_name": "Channable"
    }
  ]
}
```

**Key fields mapping → NormalizedSourceJob:**
| Recruitee Field | NormalizedSourceJob Field |
|----------------|-------------------------|
| `id` (number) | `externalJobId` (as string) |
| `title` | `title` |
| `description` + `requirements` | `body` |
| `careers_url` | `issueUrl` |
| `careers_apply_url` | `applyUrl` |
| `published_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `department`, `tags`, `employment_type_code` | `labels` |
| `city`, `country`, `remote`, `hybrid` | parsed into body |

**Company slug resolution:** From `externalKey` or `repo`.

**Attribution:**
- Label: `Recruitee Careers Site API`
- URL: `https://docs.recruitee.com/reference/offers`
- Terms: `https://recruitee.com/en/terms`

---

## Platforms Evaluated but Deprioritized

| Platform | Reason |
|----------|--------|
| **SmartRecruiters** | Requires `X-SmartToken` header (auth). Not a public API. |
| **Teamtailor** | Requires API key (`Token token=KEY`). Public API key type exists but must be generated per-account. |
| **Workday** | No public job listing API; careers pages are heavily JavaScript-rendered. |
| **iCIMS** | No public API for external consumers. |
| **BambooHR** | ATS module requires API key auth. |

---

## Implementation Plan

### Phase 1: Type System Changes

1. **Expand `SourceType` union** in `src/lib/types/index.ts`:
   ```typescript
   export type SourceType =
     | "github_repo"
     | "greenhouse_board"
     | "lever_postings"
     | "ashby_board"
     | "workable_widget"
     | "recruitee_careers";
   ```

2. **Add policy entries** in `src/lib/sources/policy.ts` for each new type.

3. **Generate DB migration** to allow new source type values (SQLite text columns are flexible, but ensure any CHECK constraints are updated).

### Phase 2: Connector Implementation

For each connector, create a file following the established pattern:

```
src/lib/sources/connectors/
├── ashby-board.ts         ← NEW
├── workable-widget.ts     ← NEW
├── recruitee-careers.ts   ← NEW
├── github-issues.ts
├── greenhouse-board.ts
├── lever-postings.ts
└── index.ts               ← register new connectors
```

Each connector implements `SourceConnector` interface:
- `type`: the new `SourceType`
- `attributionLabel`, `attributionUrl`, `termsUrl`: from `SOURCE_POLICY`
- `fetchJobs(source, since?)`: fetch from public API, normalize to `NormalizedSourceJob[]`

Pattern to follow (from existing connectors):
1. Extract board/company token from `SourceRecord` (`externalKey` > `repo` > `fullName`)
2. `fetch()` the public API endpoint
3. Filter by `since` timestamp if provided
4. Map response to `NormalizedSourceJob[]`
5. Return `SourceFetchResult` with jobs, httpStatus, latencyMs

### Phase 3: Registry and Discovery

1. **Register connectors** in `src/lib/sources/connectors/index.ts`
2. **Update discovery** in `src/lib/sources/discovery.ts`:
   - Extend `AtsCatalogSource.sourceType` to accept new types
   - Load new ATS entries from `data/international-ats-sources.json`
3. **Update `data/international-ats-sources.json`** with curated Ashby/Workable/Recruitee company tokens for BR/LATAM/intl-latam-friendly companies

### Phase 4: UI Updates

1. **Sources page** (`src/app/app/(protected)/sources/page.tsx`):
   - Add "Add Ashby Source", "Add Workable Source", "Add Recruitee Source" options
   - Display correct icons/labels for new source types
2. **i18n labels** in `src/lib/i18n/index.tsx` for new connector names

### Phase 5: Validation

- Update `POST /api/sources/[id]/validate` to handle new source types
- Test with known active companies (e.g., Ashby: `ashby`, Workable: `rentokil-initial`, Recruitee: `channable`)

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Type system + policy + migration | ~1 hour |
| Ashby connector | ~2 hours |
| Workable connector | ~2 hours |
| Recruitee connector | ~2 hours |
| Registry + discovery updates | ~1 hour |
| UI additions for new source types | ~2 hours |
| Testing + validation | ~2 hours |
| **Total** | **~12 hours** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Workable widget API has no description field | Rely on title + location + department for parsing; consider per-job detail endpoint |
| Rate limiting on public APIs | Health scoring + throttle already handles this |
| ATS companies change their tokens/subdomains | Health system degrades gracefully, marks source as critical |
| Recruitee uses company slug in subdomain (not path) | Construct URL differently from Greenhouse/Lever pattern |

---

## References

- Ashby Posting API docs: https://developers.ashbyhq.com/docs/public-job-posting-api
- Workable Widget API: `GET https://apply.workable.com/api/v1/widget/accounts/{name}`
- Recruitee Careers Site API: https://docs.recruitee.com/reference/offers
- "5 ATS Platforms with Public Job Posting APIs": https://fantastic.jobs/article/ats-with-api
