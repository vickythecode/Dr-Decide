import boto3

# Initialize the AWS Comprehend Medical client
client = boto3.client('comprehendmedical', region_name='us-east-1')

def extract_medical_entities(text: str):
    """
    Extracts medical entities (medications, conditions, etc.) from doctor notes.
    """
    try:
        response = client.detect_entities_v2(Text=text)
        entities = response.get('Entities', [])
        
        # Filter for high-confidence entities to pass to Bedrock
        important_entities = [
            {"text": ent['Text'], "category": ent['Category'], "type": ent['Type']}
            for ent in entities if ent['Score'] > 0.8
        ]
        return important_entities
    except Exception as e:
        print(f"Comprehend Medical Error: {e}")
        return []