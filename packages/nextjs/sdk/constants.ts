import protobuf from "protobufjs";

export const CONTENT_TOPIC = "/yenshia/1/location-sharing/proto";

export const locationMessage = new protobuf.Type("LocationMessage")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("message", 3, "string"));
