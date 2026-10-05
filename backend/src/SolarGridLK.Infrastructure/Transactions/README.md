MongoTransactionRunner

This folder contains an infrastructure-only transaction runner abstraction and implementation used by the ReservationService.

IMongoTransactionRunner
- RunInTransactionAsync<T>(Func<IClientSessionHandle, Task<T>> operation)

MongoTransactionRunner
- Wraps MongoDB.Driver.IMongoClient.StartSessionAsync and calls WithTransactionAsync
- Uses majority write concern for transaction safety

Usage
- Inject IMongoTransactionRunner into services in the Infrastructure layer
- Use RunInTransactionAsync to execute repository operations that accept a IClientSessionHandle

Rationale
- Keeps MongoDB driver session types out of the Application project and service interfaces
- Centralizes transaction options and retry policy in one place
