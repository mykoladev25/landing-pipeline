#!/bin/bash
SUCCESS_COUNT=0
TARGET=10
ATTEMPT=1

echo "Starting batch run for $TARGET successful pitches..."

while [ $SUCCESS_COUNT -lt $TARGET ]; do
    echo "=== Attempt $ATTEMPT (Successful: $SUCCESS_COUNT/$TARGET) ==="
    ~/Sites/restaurant-pitch/pitch.js
    if [ $? -eq 0 ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT+1))
        echo "✅ Success! Total successful: $SUCCESS_COUNT/$TARGET"
    else
        echo "⚠️ Attempt failed. Retrying..."
    fi
    ATTEMPT=$((ATTEMPT+1))
    sleep 10 # Пауза щоб не зловити Rate Limit від AI
done

echo "🎉 Всі $TARGET розсилок успішно завершено!"
