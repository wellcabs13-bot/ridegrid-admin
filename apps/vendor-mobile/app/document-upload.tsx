import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Chips,
  Field,
  Label,
  Screen,
  State,
} from "../src/components/ui";
import { api } from "../src/services/api";
import { assertOnline } from "../src/utils/offline";
import { useApp } from "../src/state/Providers";
export default function Upload() {
  const { entity, entityId } = useLocalSearchParams<{
      entity: string;
      entityId: string;
    }>(),
    { online } = useApp(),
    client = useQueryClient();
  const [type, setType] = useState("OTHER"),
    [expiry, setExpiry] = useState(""),
    [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null),
    [error, setError] = useState("");
  const mutation = useMutation({
    networkMode: "always",
    mutationFn: async () => {
      assertOnline(online);
      if (!file) throw new Error("Choose a document first.");
      const data = new FormData();
      data.append("entity", entity);
      data.append("entityId", entityId);
      data.append("documentType", type);
      if (expiry) data.append("expiryDate", expiry);
      if (Platform.OS === "web" && file.file) data.append("file", file.file);
      else
        data.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        } as unknown as Blob);
      return api("/api/mobile/vendor/documents", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      setFile(null);
      client.invalidateQueries();
    },
  });
  return (
    <Screen title="Upload document">
      <Card>
        <Label muted>
          PDF, PNG or JPEG · up to 10 MB. Verification is performed by RideGrid
          Operations.
        </Label>
        <Chips
          values={
            entity === "vehicle"
              ? [
                  "RC",
                  "INSURANCE",
                  "PERMIT",
                  "FITNESS",
                  "POLLUTION",
                  "TAX",
                  "OTHER",
                ]
              : entity === "driver"
                ? ["DRIVING_LICENSE", "AADHAAR", "OTHER"]
                : ["PAN", "GST", "UDYAM", "OTHER"]
          }
          value={type}
          onChange={setType}
        />
        <Field
          label="Expiry date (YYYY-MM-DD, optional)"
          value={expiry}
          onChangeText={setExpiry}
        />
        <Button
          title={file ? file.name : "Choose document"}
          onPress={async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "image/png", "image/jpeg"],
                copyToCacheDirectory: true,
              });
              if (!result.canceled) {
                const chosen = result.assets[0];
                if (chosen.size && chosen.size > 10 * 1024 * 1024)
                  throw new Error("Maximum file size is 10 MB.");
                setFile(chosen);
                setError("");
              }
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to select file.",
              );
            }
          }}
        />
        {!!error && <Label>{error}</Label>}
        <State error={mutation.error} />
        {mutation.isSuccess && (
          <Label>Document uploaded and pending verification.</Label>
        )}
        <Button
          title={mutation.isPending ? "Uploading…" : "Upload for verification"}
          disabled={!online || !file || mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      </Card>
    </Screen>
  );
}
