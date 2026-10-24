# Kitchen Cruze Firestore Security Specification

## 1. Data Invariants
- Products: Publicly readable by all customers; writes restricted to verified admin/server.
- Categories: Publicly readable; writes restricted to admin/server.
- Reviews: Publicly readable; new reviews require valid rating (1-5), name, and content.
- Settings: Publicly readable; writes restricted to admin/server.

## 2. The Dirty Dozen Payloads
1. Product with negative price: Rejected
2. Category with empty name: Rejected
3. Review without user name: Rejected
4. Review with invalid rating (6 or -1): Rejected
5. Review with oversized comment (> 2000 chars): Rejected
6. Modification of product ID: Rejected
7. Product with script injection in description: Rejected
8. Unauthenticated deletion of category: Rejected
9. Spoofed document ID poisoning (> 128 chars): Rejected
10. Anonymous modification of restaurant operational settings: Rejected
11. Blank review submission: Rejected
12. Attempt to overwrite admin settings: Rejected
