# Avirzo v2.19.1 — US dollar pricing for global card payments

## Changes
- Pesapal now defaults to **USD** (`PESAPAL_CURRENCY=USD`). With no price settings, plans sell at **$19 (Creator) / $59 (Studio)** and packs at **$6 / $20 / $55** (override with `PESAPAL_*_PRICE` or `CREDIT_PACK_*_PRICE_USD`). No exchange rate is needed in USD; other currencies still require explicit prices and `PESAPAL_UNITS_PER_USD`.
- Prices display as `$19`. Order amounts are sent to Pesapal with two decimals.
- Terms now state prices are in US dollars, that cards issued anywhere (Visa, Mastercard, Amex) are accepted, and that banks may add foreign-transaction fees and taxes may apply. Users re-accept the updated Terms.
- `LAUNCH.md`: ask Pesapal to enable USD and international cards on your merchant account, confirm fees and settlement, test with a non-Ugandan card, and plan for VAT / sales tax.

## Notes
- USD checkout is card-oriented. Ugandan mobile-money customers usually pay in UGX, so they may not be able to pay in USD.
- Pesapal is not a merchant of record, so international tax is your responsibility.
