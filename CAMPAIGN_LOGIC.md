# TSC Performance Report: Campaign & Logic Documentation

## Overview
This document outlines the business logic used in the TSC Performance Report Generator to categorize Meta campaigns and adsets. It explains how campaigns are mapped to Funnels (Top, Mid, Bottom, Growth) and Categories (Mattress, Chair, Desk, Sofa, etc.), ensuring the application's output exactly mirrors the manual Excel Pivot Table calculations.

---

## 1. Funnel Classification
Funnels are determined strictly based on the **Campaign Name**. The application checks the campaign name in a specific priority order.

| Funnel | Priority | Condition |
| :--- | :--- | :--- |
| **GROWTH** | Highest | Campaign name contains `growth` |
| **BOTTOM** | High | Campaign name contains `bot` AND does NOT contain `growth` |
| **MID** | Medium | Campaign name contains `mid` AND does NOT contain `growth` |
| **TOP** | Lowest | Campaign name does NOT contain `mid` and does NOT contain `bot` |

> [!NOTE]
> `growth` overrides everything. If a campaign is named `TSC_Growth_Mid_Funnel`, it is classified as GROWTH, not MID.

---

## 2. Category Mapping (LC to LP & CPM Reports)
The LC to LP and CPM reports use a complex categorization logic located in `lib/metricUtils.ts`. This logic mirrors how the Excel Pivot Table maps data by looking at both **Campaign Names** and **Adset Names**.

### The "All Products" & "Dhoni" Exclusivity Gate
A critical issue previously caused Mattress data to leak into the Chair, Desk, and Sofa reports. Campaigns like `TSC_All_Products...` or `TSC_Dhoni...` contained adsets named `Chair_Video`, which caused Excel and the Tool to mismatch.

**The Fix:**
An explicit logical gate was added to strictly assign these campaigns to the Mattress category.
- If a campaign contains `all_products` or `dhoni`, it is **permanently blocked** from being mapped to Chair, Desk, Sofa, Elite, Foot Massager, Accessories, or Bed.
- It is only allowed to map to **Mattress** and **All**.

### Standard Exclusions
- `boost` and `growth` campaigns are excluded from **all** standard category reports.

### Category-Specific Rules
| Category | Contains (Campaign) | Excludes (Campaign) | Excludes (Adset) | Keyword Match (Adset) |
| :--- | :--- | :--- | :--- | :--- |
| **All** | *Everything* | `boost`, `growth` | `boost`, `growth` | N/A |
| **Mattress** | `mat`, `all_products`, `dhoni` | `sofa`, `desk`, `elite`, `foot`, `bed`, `acce`, `chair`, `pillow`, `cushion`, `massa`, `sensai`, `boost`, `growth` | `sofa`, `desk`, `chair`, `boost`, `growth` | `mat` |
| **Chair** | `chair` | `boost`, `growth`, `desk`, `sofa` | `mattress`, `mat`, `desk`, `sofa`, `boost`, `growth` | `chair` |
| **Desk** | `desk` | `boost`, `growth`, `chair`, `sofa` | `mattress`, `mat`, `sofa`, `chair`, `boost`, `growth` | `desk` |
| **Sofa** | `sofa` | `boost`, `growth`, `chair`, `desk` | `mattress`, `mat`, `desk`, `chair`, `boost`, `growth` | `sofa` |
| **Elite** | `elite` | `boost`, `growth` | `boost`, `growth` | `elite` |
| **Foot Massager**| `foot` | `boost`, `growth` | `boost`, `growth` | `foot` |
| **Accessories** | `acce` | `boost`, `growth` | `boost`, `growth` | `acce` |
| **Bed** | `bed` | `boost`, `growth` | `boost`, `growth` | `bed` |

> [!TIP]
> If a campaign explicitly declares its category (e.g., Campaign name is `TSC_Chair_Mid_Funnel`), the tool **bypasses Adset Exclusions**. This ensures that if a Chair campaign happens to test a desk audience, it doesn't get accidentally excluded.

---

## 3. Region and 6-City Reports
The **6 City** and **Region** reports use a completely different logic (`lib/classify.ts`) because they are strictly looking at geographical metrics rather than product categorization. 

Because these reports are designed strictly for Mattress/Global mapping, they utilize a hardcoded global exclusion list.

**Global Exclusions for City/Region:**
`['chair', 'desk', 'sofa', 'elite', 'foot']`

If **either** the Campaign Name OR the Adset Name contains any of those words, the entire row is assigned to `EXCLUDED` and omitted from the City and Region reports. This guarantees that non-Mattress product tests do not pollute the geographical analysis.

---

## 4. Summary of Recent Changes
1. **Adset Mapping Calibration**: Updated `metricUtils.ts` so that specific categories (Chair, Desk, Sofa) correctly match their respective adset keywords, fixing the issue where they were missing large volumes of data.
2. **Exclusivity Gate Implementation**: Built the `isAllProductsOrDhoni` logical wall to prevent Mattress campaigns from leaking into other reports via adset names.
3. **The "All" Loophole Fix**: Ensured that the logical exclusivity gate does not block "All Products" and "Dhoni" campaigns from the "All" category, ensuring the "All" report matches the global Excel pivot.
