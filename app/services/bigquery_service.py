from typing import List, Optional, Dict, Any
from google.cloud import bigquery
from app.schemas.startup import StartupCreate, StartupEvaluationCreate
from app.db.models.startup import StartupStatus


class BigQueryService:
    def __init__(self):
        self.client = bigquery.Client()
        self.dataset_name = "scopify"
        self.table_name = "startups"

    async def fetch_startups(
        self,
        name: Optional[str] = None,
        status: Optional[StartupStatus] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch startups from BigQuery with optional filters
        """
        query = f"""
        SELECT *
        FROM `{self.dataset_name}.{self.table_name}`
        WHERE 1=1
        """
        
        if name:
            query += f"\nAND LOWER(name) LIKE LOWER('%{name}%')"
            
        if status:
            query += f"\nAND status = '{status.value}'"
            
        query += f"\nLIMIT {limit}"
        
        query_job = self.client.query(query)
        results = query_job.result()
        
        return [dict(row.items()) for row in results]

    async def fetch_startup_by_id(self, startup_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetch a specific startup by ID
        """
        query = f"""
        SELECT *
        FROM `{self.dataset_name}.{self.table_name}`
        WHERE id = {startup_id}
        LIMIT 1
        """
        
        query_job = self.client.query(query)
        results = query_job.result()
        
        for row in results:
            return dict(row.items())
        return None

    async def search_startups(self, search_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Advanced search with multiple parameters
        """
        query = f"""
        SELECT *
        FROM `{self.dataset_name}.{self.table_name}`
        WHERE 1=1
        """
        
        # Add dynamic filters based on search parameters
        for key, value in search_params.items():
            if value is not None:
                if isinstance(value, str):
                    query += f"\nAND LOWER({key}) LIKE LOWER('%{value}%')"
                elif isinstance(value, (int, float)):
                    query += f"\nAND {key} = {value}"
                elif isinstance(value, bool):
                    query += f"\nAND {key} = {str(value).lower()}"
                elif isinstance(value, list):
                    formatted_values = [f"'{v}'" if isinstance(v, str) else str(v) for v in value]
                    query += f"\nAND {key} IN ({','.join(formatted_values)})"

        query += "\nLIMIT 100"  # Safety limit
        
        query_job = self.client.query(query)
        results = query_job.result()
        
        return [dict(row.items()) for row in results]

    async def ingest_startup_data(self, startup: StartupCreate) -> Dict[str, Any]:
        """
        Ingest new startup data into BigQuery
        """
        table_ref = self.client.dataset(self.dataset_name).table(self.table_name)
        table = self.client.get_table(table_ref)
        
        rows_to_insert = [{
            'name': startup.name,
            'website': startup.website,
            'status': startup.status.value if startup.status else StartupStatus.ACTIVE.value,
            'created_at': bigquery.ScalarQueryParameter(
                None, 'TIMESTAMP', bigquery.CURRENT_TIMESTAMP
            ),
            'updated_at': bigquery.ScalarQueryParameter(
                None, 'TIMESTAMP', bigquery.CURRENT_TIMESTAMP
            )
        }]
        
        errors = self.client.insert_rows_json(table, rows_to_insert)
        
        if errors:
            raise Exception(f"Errors occurred while ingesting data: {errors}")
            
        return rows_to_insert[0]