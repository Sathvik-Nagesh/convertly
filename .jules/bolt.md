## 2024-05-24 - Array Methods and Math Overhead in Hot Loops
**Learning:** In tight loops like pixel processing (e.g., K-Means color clustering), combining higher-order array methods (`forEach`, `reduce`), and heavy Math functions (`Math.pow`, `Math.sqrt`) introduces significant performance overhead due to function allocations and object creation.
**Action:** Replace nested `forEach`/`reduce` with traditional `for` loops, and `Math.pow`/`Math.sqrt` with squared multiplication for simple distance comparisons where absolute magnitude isn't strictly required.
