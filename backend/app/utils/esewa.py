"""
eSewa Payment Gateway Integration
Based on django-esewa package: https://github.com/hehenischal/django-esewa
"""
import hmac
import hashlib
import base64
from typing import Dict, Optional
from urllib.parse import urlencode


class EsewaPayment:
    """
    eSewa Payment Gateway Integration for FastAPI
    """
    
    # Test credentials
    TEST_SECRET_KEY = "8gBm/:&EnhH.1/q"
    TEST_PRODUCT_CODE = "EPAYTEST"
    TEST_MERCHANT_ID = "EPAYTEST"
    
    # Production URLs
    PRODUCTION_URL = "https://epay.esewa.com.np/api/epay/main/v2/form"
    TEST_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
    
    def __init__(
        self,
        amount: float,
        tax_amount: float = 0.0,
        total_amount: float = None,
        product_code: str = None,
        product_service_charge: float = 0.0,
        product_delivery_charge: float = 0.0,
        transaction_uuid: str = None,
        success_url: str = "http://localhost:3000/payment/success",
        failure_url: str = "http://localhost:3000/payment/failure",
        secret_key: str = None,
        is_test: bool = True,
    ):
        self.amount = amount
        self.tax_amount = tax_amount
        self.total_amount = total_amount or (amount + tax_amount)
        self.product_code = product_code or self.TEST_PRODUCT_CODE
        self.product_service_charge = product_service_charge
        self.product_delivery_charge = product_delivery_charge
        self.transaction_uuid = transaction_uuid
        self.success_url = success_url
        self.failure_url = failure_url
        self.secret_key = secret_key or self.TEST_SECRET_KEY
        self.is_test = is_test
        self.signature = None
    
    def generate_signature(self) -> str:
        """
        Generate HMAC signature for eSewa payment
        """
        # Create the string to sign
        string_to_sign = (
            f"total_amount={self.total_amount},"
            f"transaction_uuid={self.transaction_uuid},"
            f"product_code={self.product_code}"
        )
        
        # Generate HMAC SHA256 signature
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        # Base64 encode the signature
        self.signature = base64.b64encode(signature).decode('utf-8')
        return self.signature
    
    def generate_form_data(self) -> Dict[str, str]:
        """
        Generate form data for eSewa payment form
        """
        if not self.signature:
            self.generate_signature()
        
        return {
            "amount": str(self.total_amount),
            "tax_amount": str(self.tax_amount),
            "product_code": self.product_code,
            "product_service_charge": str(self.product_service_charge),
            "product_delivery_charge": str(self.product_delivery_charge),
            "total_amount": str(self.total_amount),
            "transaction_uuid": self.transaction_uuid,
            "product_name": "Room Booking",
            "success_url": self.success_url,
            "failure_url": self.failure_url,
            "signed_field_names": "total_amount,transaction_uuid,product_code",
            "signature": self.signature,
        }
    
    def generate_form_html(self) -> str:
        """
        Generate HTML form for eSewa payment
        """
        form_data = self.generate_form_data()
        url = self.TEST_URL if self.is_test else self.PRODUCTION_URL
        
        html = f'<form id="esewa-form" action="{url}" method="POST">\n'
        for key, value in form_data.items():
            html += f'  <input type="hidden" name="{key}" value="{value}">\n'
        html += '</form>'
        html += '<script>document.getElementById("esewa-form").submit();</script>'
        
        return html
    
    def verify_signature(self, received_signature: str, data: Dict[str, str]) -> bool:
        """
        Verify eSewa payment signature
        """
        # Reconstruct the string to sign from received data
        string_to_sign = (
            f"total_amount={data.get('total_amount')},"
            f"transaction_uuid={data.get('transaction_uuid')},"
            f"product_code={data.get('product_code')}"
        )
        
        # Generate expected signature
        expected_signature = hmac.new(
            self.secret_key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        expected_signature_b64 = base64.b64encode(expected_signature).decode('utf-8')
        
        return received_signature == expected_signature_b64


def generate_signature(
    total_amount: float,
    transaction_uuid: str,
    key: str = "8gBm/:&EnhH.1/q",
    product_code: str = "EPAYTEST"
) -> str:
    """
    Standalone function to generate eSewa signature
    """
    string_to_sign = (
        f"total_amount={total_amount},"
        f"transaction_uuid={transaction_uuid},"
        f"product_code={product_code}"
    )
    
    signature = hmac.new(
        key.encode('utf-8'),
        string_to_sign.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    return base64.b64encode(signature).decode('utf-8')

