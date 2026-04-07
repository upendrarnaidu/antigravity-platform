import os
from pinecone import Pinecone, ServerlessSpec
import logging

logging.basicConfig(level=logging.INFO)

pincone_api_key = os.environ.get("PINECONE_API_KEY")
INDEX_NAME = "marketing-platform-embeddings"

def get_pinecone_index():
    if not pincone_api_key:
        logging.warning("PINECONE_API_KEY not set, tracking will be disabled.")
        return None
        
    pc = Pinecone(api_key=pincone_api_key)
    
    # Initialize index if it doesn't exist
    if INDEX_NAME not in [i.name for i in pc.list_indexes()]:
        logging.info(f"Creating Pinecone index: {INDEX_NAME}")
        pc.create_index(
            name=INDEX_NAME, 
            dimension=1536, # OpenAI ada-002 dimensionality
            metric="cosine", 
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        
    return pc.Index(INDEX_NAME)

def search_high_performing_posts(audience_query: str, embeddings_model, top_k=3):
    """
    RAG utility to query Pinecone for past posts that performed well
    for a specific audience/niche.
    """
    index = get_pinecone_index()
    if not index:
        return []
        
    # Generate embedding for the search query
    query_vector = embeddings_model.embed_query(audience_query)
    
    # Query pinecone (filter by high performance)
    results = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        filter={
            "performance_score": {"$gte": 0.8} # Only pull successful posts
        }
    )
    
    return [match['metadata']['content'] for match in results.get('matches', [])]
