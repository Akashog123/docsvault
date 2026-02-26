# Entity-Relationship Diagram

## Database Schema

```mermaid
erDiagram
    Organization {
        ObjectId _id PK
        String name
        String slug UK
        ObjectId adminId FK
        String inviteCode "Sparse UK"
        Date createdAt
        Date updatedAt
    }

    User {
        ObjectId _id PK
        String name
        String email UK
        String password
        ObjectId orgId FK
        String role "super_admin | admin | member"
        Date createdAt
        Date updatedAt
    }

    Plan {
        ObjectId _id PK
        String name UK
        String color
        Array features "string array"
        Mixed limits "maxDocuments, maxStorage"
        Number price
        Boolean isDefault
        Boolean isActive
        Date createdAt
        Date updatedAt
    }

    Subscription {
        ObjectId _id PK
        ObjectId orgId FK
        ObjectId planId FK
        String status "active | expired"
        Date startDate
        Date endDate
        Date createdAt
        Date updatedAt
    }

    Document {
        ObjectId _id PK
        String title
        String description
        String fileName
        String originalFileName
        String mimeType
        Number fileSize
        Buffer fileData
        ObjectId orgId FK
        ObjectId uploadedBy FK
        Array sharedWith "user ObjectIds"
        Number currentVersion
        Array versions "embedded docs"
        Date createdAt
        Date updatedAt
    }

    UsageRecord {
        ObjectId _id PK
        ObjectId orgId FK
        String metric "documents | storage"
        Number count
        Date periodStart
        Date periodEnd
        Date lastResetAt
    }

    Organization ||--o{ User : "has members"
    Organization ||--o{ Subscription : "has subscriptions"
    Organization ||--o{ Document : "owns documents"
    Organization ||--o{ UsageRecord : "tracks usage"
    Plan ||--o{ Subscription : "assigned to"
    User ||--o{ Document : "uploads"
```

## Index Strategy

```mermaid
graph LR
    subgraph Indexes["Database Indexes"]
        I1["Organization.slug<br/>(unique)"]
        I2["Organization.inviteCode<br/>(sparse unique)"]
        I3["User.email<br/>(unique)"]
        I4["User.orgId<br/>(query perf)"]
        I5["Plan.name<br/>(unique)"]
        I6["Subscription.orgId + status<br/>(compound)"]
        I7["Document.orgId<br/>(tenant isolation)"]
        I8["Document.title + description<br/>(text index)"]
        I9["UsageRecord.orgId + metric + periodStart<br/>(compound unique)"]
    end

    style Indexes fill:#f8fafc
```

## Feature-to-Plan Entitlement Matrix

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| `doc_crud` | Yes | Yes | Yes |
| `sharing` | No | Yes | Yes |
| `versioning` | No | Yes | Yes |
| `advanced_search` | No | No | Yes |
| **maxDocuments** | 10 | 200 | Unlimited |
| **maxStorage** | 100 MB | 1 GB | Unlimited |
| **Price** | $0/mo | $29.99/mo | $99.99/mo |
