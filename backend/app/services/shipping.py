class ShippingService:
    FREE_SHIPPING_THRESHOLD_XOF = 50_000
    COTONOU_FEE_XOF = 1_500
    OTHER_CITY_FEE_XOF = 3_000

    @classmethod
    def calculate_fee(cls, *, city: str, subtotal_xof: int) -> int:
        if subtotal_xof >= cls.FREE_SHIPPING_THRESHOLD_XOF:
            return 0
        normalized_city = city.strip().casefold()
        return cls.COTONOU_FEE_XOF if normalized_city == "cotonou" else cls.OTHER_CITY_FEE_XOF
