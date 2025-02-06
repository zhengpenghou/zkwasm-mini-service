import mongoose from 'mongoose';
import { modelBundle } from "./config.js";

const mongoUri = "mongodb://localhost"; // 替换成你的 MongoDB URI
const taskId = "67a1e3f0e2dc2c324760d1de"; // 替换成你要查询的 taskId

async function queryRecord(taskId: string) {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');

    // Query the record
    const record = await modelBundle.findOne({ taskId: taskId });
    
    if (record) {
      console.log('Record found:', {
        taskId: record.taskId,
        merkleRoot: record.merkleRoot,
        settleTxHash: record.settleTxHash,
        settleStatus: record.settleStatus,
        withdrawArray: record.withdrawArray
      });
      return record;
    } else {
      console.log('No record found for taskId:', taskId);
      return null;
    }

  } catch (error) {
    console.error('Error querying record:', error);
    throw error;
  } finally {
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

async function queryLatestRecords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');

    // Query latest 10 records
    const records = await modelBundle.find({})
      .sort({ _id: -1 }) // 按 _id 降序排序，最新的在前
      .limit(10);
    
    console.log('\nLatest 10 records:');
    records.forEach((record, index) => {
      console.log(`\n${index + 1}. Record:`, {
        taskId: record.taskId,
        merkleRoot: record.merkleRoot,
        settleTxHash: record.settleTxHash,
        settleStatus: record.settleStatus,
        withdrawArray: record.withdrawArray
      });
    });

    return records;
  } catch (error) {
    console.error('Error querying latest records:', error);
    throw error;
  } finally {
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// 运行查询
async function main() {
  // 先查询指定的 taskId
  await queryRecord(taskId);
  
  // 然后查询最新的10条记录
  await queryLatestRecords();
}

main().catch(console.error);

// Example usage:
/*
const config = {
  mongoUri: "mongodb://localhost:27017/your_database"
};

async function main() {
  const query = new RecordQuery(config);
  const record = await query.queryByTaskId("your_task_id");
}

main().catch(console.error);
*/ 