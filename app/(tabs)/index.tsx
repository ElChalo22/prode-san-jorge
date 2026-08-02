import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet } from "react-native";

import HomeHeader from "../../components/home/HomeHeader";
import HomeRanking from "../../components/home/HomeRanking";
import HomeStats from "../../components/home/HomeStats";
import ProdeCard from "../../components/home/ProdeCard";

import { competitionGroups } from "../../services/prodeGroups";

export default function HomeScreen() {
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <HomeHeader username="Chalo" />

        {competitionGroups.map((group) => (
          <ProdeCard
            key={group.id}
            emoji={group.title.split(" ")[0]}
            title={group.title.replace(group.title.split(" ")[0] + " ", "")}
            description={group.description}
            jackpot="$0"
            players={0}
            countdown="--:--:--"
            onPress={() =>
              router.push({
                pathname: "/pronosticos",
                params: {
                  group: group.id,
                },
              })
            }
          />
        ))}

        <HomeStats />

        <HomeRanking />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
  },
});